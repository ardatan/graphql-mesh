---
id: introspection-cache
title: Introspection cache
sidebar_label: Introspection cache
---

By default GraphQL Mesh fetches your remote data sources at runtime, during initialisation, to retrieve their raw schema and potentially translate it into GraphQL (when relevant).  
However, to reduce dependencies at runtime, GraphQL Mesh allows you to cache the raw schema of your remote data sources so they are locally available at runtime.  
This is important because if, for instance, one of the data sources you consume experiences downtime when your GraphQL Mesh server is starting, this would cause a failure and will ultimately force you to restart your server; effectively making this unavailable until you're able to start it successfully (in this case, only when all your data sources can provide their raw schemas).  
By following the steps below, you can instead move this dependency from runtime to build-time, by invoking a command that downloads the remote schemas and save them into a local file to be used as cache during server initialisation. In this case if one of your remote resources is not available when you attempt to build this local cache, it would cause a build failure which will stop your deployment process; hence not affecting your service availability.

To achieve this, you just need to:

- Tell Mesh, through config file (`.meshrc.yaml`), which file you want to use to cache remote sources raw schemas
- Set a script, to be invoked at build-time, to fetch and cache your remote sources raw schemas (leveraging Mesh CLI)

## Setting the Mesh Config file

You just need to add the `introspectionCache` property to your `.meshrc.yaml` file, like below:

```yaml
introspectionCache: ./introspectionCache.json
sources: [...]
transforms: [...]
```

When this property is set, Mesh will attempt to read from this file during initialisation, and will use the raw schemas available there; hence preventing network requests that would otherwise be required to retrieve the raw schemas from your remote data sources directly.

> NOTE: make sure your designated file has a `json` extension.

## Setup the script to write the cache

Mesh CLI provides you the `write-introspection-cache`command which goes through all your remote data sources, retrieves their raw schemas, and eventually store these into your designated file. This command does not require any argument, since it is aware of your nominated `introspectionCache` file from the property set in your Mesh Config.

> NOTE: Make sure you have installed the `@graphql-mesh/cli` package to run CLI commands.

Here is an example of how you might want to set up your build script in `package.json`:

```json
{
  "name": "graphql-mesh-server",
  ...
  "main": "src/index.js",
  "scripts": {
    "write-introspection-cache": "graphql-mesh write-introspection-cache",
    "build": "npm run write-introspection-cache && babel src -d dist",
    ...
  },
  ...
}
```

Alternatively, you might prefer to set up a step in your CI that invokes `write-introspection-cache`.  
The key point is to make sure that this command is invoked before you attempt to start the server, so that when initialising Mesh will find the introspection cache file and read from it, as opposed to querying your remote sources.
