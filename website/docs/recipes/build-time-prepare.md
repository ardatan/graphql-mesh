---
id: build-time-prepare
title: Build-time preparation
sidebar_label: Build-time preparation
---

By default GraphQL Mesh downloads the schemas for your data sources at runtime before proceeding to build your GraphQL schema.  
However, in order to reduce dependencies at runtime, GraphQL Mesh allows you to download the specifications for your data sources at build time.  
The advantage to this approach is to remove dependencies at runtime. If, for instance, one of the data sources you consume is experiencing downtime when you start your GraphQL Mesh server, this would cause a failure and will ultimately force you to restart your server; effectively making this unavailable until you're able to start it successfully (only when all your data sources are able to provide their specifications).  
By following the steps below you can instead move the dependencies to build-time and so get a failure before attempting to deploy your build to Production.

In order to achieve this, you just need to:
- Tell Mesh config file (`.meshrc.yaml`) which directory you want to store the data sources specifications
- Configure a build time step to download all specifications (leveraging Mesh CLI)

## Setting the Mesh config file

You just need to add the `rawSourcesDir` property to your `.meshrc.yml` file, like below:

```yaml
rawSourcesDir: ./rawSources
sources: [...]
transforms: [...]
```

## Configure the build time step
Mesh CLI provides you the `prepare-raw-sources`command which goes through all your data sources, downloads their specifications, and saves one file per data-source to your nominated directory. This command does not require any argument, since it will read your nominated `rawSourcesDir` from the `.meshrc.yml` config file.

> NOTE: Make sure you have installed the `@graphql-mesh/cli` package in order to run CLI commands.

Here is an example of how you might want to setup your build script in `package.json`:

```json
{
  "name": "graphql-mesh-server",
  ...
  "main": "src/index.js",
  "scripts": {
    "prepareRawSources": "graphql-mesh prepare-raw-sources",
    "build": "npm run prepareRawSources && babel src -d dist",
    ...
  },
  ...
}
```