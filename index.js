const core = require("@actions/core");
const AWS = require("aws-sdk");

const s3 = new AWS.ECS();
const resourcegroupstaggingapi = new AWS.ResourceGroupsTaggingAPI();

const parseJsonFromMultiline = (value) => {
  if (Array.isArray(value)) {
    return JSON.parse(value[0]);
  } else {
    return JSON.parse(value);
  }
}

const main = async () => {
  const cluster = core.getInput("cluster", { required: true });
  const tagFilters = parseJsonFromMultiline(core.getMultilineInput("tag_filters", { required: true }));
  
  core.debug("Finding services with proper tags...");

  const services = await resourcegroupstaggingapi.getResources({
    TagFilters: Object.entries(tagFilters).map(([key, value]) => ({
      Key: key,
      Values: value,
    })),
    ResourceTypeFilters: ["ecs:service"],
  }).promise();

  core.debug("Forcing new deployments...");
  const resourceArns = services.ResourceTagMappingList.map(x => x.ResourceARN);

  try {
    for (const resourceArn of resourceArns) {
      console.log(`-> Forcing new deployment for ${resourceArn}`);
  
      await s3.updateService({
        cluster: cluster,
        service: resourceArn,
        forceNewDeployment: true,
      }).promise();
    }
  } catch (e) {
    core.setFailed(e);
  }
};

main();
