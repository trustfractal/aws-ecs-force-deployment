# AWS ECS force deployment

Run a force deployment for all services with proper tags in cluster

Usage:

``` yaml      
- name: Force new deployment
  uses: trustfractal/aws-ecs-force-deployment@v1.0
  with:
    cluster: "staging"
    tag_filters: |
      { "Application": ["awesome"], "Service": ["staging"] }
```

See [action.yml](action.yml) file for the full documentation of this action's inputs and outputs.

## License Summary

This code is made available under the MIT license.
