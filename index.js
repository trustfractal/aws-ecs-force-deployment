import * as core from "@actions/core";
import { 
  ResourceGroupsTaggingAPIClient, 
  GetResourcesCommand 
} from "@aws-sdk/client-resource-groups-tagging-api";
import { 
  ECSClient, 
  DescribeServicesCommand, 
  UpdateServiceCommand 
} from "@aws-sdk/client-ecs";

const ecsClient = new ECSClient({});
const taggingClient = new ResourceGroupsTaggingAPIClient({});

const parseJsonFromMultiline = (value) => {
  if (Array.isArray(value)) {
    return JSON.parse(value[0]);
  }
  return JSON.parse(value);
};

const main = async () => {
  try {
    const cluster = core.getInput("cluster", { required: true });
    const tagFiltersInput = core.getMultilineInput("tag_filters", { required: true });
    const tagFilters = parseJsonFromMultiline(tagFiltersInput);

    core.debug("Finding services with proper tags...");

    const getResourcesCmd = new GetResourcesCommand({
      TagFilters: Object.entries(tagFilters).map(([key, value]) => ({
        Key: key,
        Values: Array.isArray(value) ? value : [value],
      })),
      ResourceTypeFilters: ["ecs:service"],
    });

    const services = await taggingClient.send(getResourcesCmd);
    
    if (!services.ResourceTagMappingList || services.ResourceTagMappingList.length === 0) {
      core.info("No services found matching the tags.");
      return;
    }

    const resourceArns = services.ResourceTagMappingList.map(x => x.ResourceARN);

    core.debug("Forcing new deployments...");

    for (const resourceArn of resourceArns) {
      const describeCmd = new DescribeServicesCommand({
        services: [resourceArn],
        cluster,
      });
      
      const info = await ecsClient.send(describeCmd);

      if (info.services?.[0]?.status === "ACTIVE") {
        console.log(`-> Forcing new deployment for ${resourceArn}`);

        const updateCmd = new UpdateServiceCommand({
          cluster,
          service: resourceArn,
          forceNewDeployment: true,
        });

        await ecsClient.send(updateCmd);
      } else {
        console.log(`-> Service ${resourceArn} is not active or not found, skipping...`);
      }
    }
  } catch (e) {
    core.setFailed(e instanceof Error ? e.message : String(e));
  }
};

main();