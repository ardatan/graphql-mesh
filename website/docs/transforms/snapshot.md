---
id: snapshot
title: Snapshot Transform
sidebar_label: Snapshot
---

The `snapshot` transform allow you to apply snapshot for development usage.

The snapshot transform writes the responses of your remote data source to your file-system and then uses it instead of re-fetching it every time. It's alse useful because you can easily manipulate your data manually, and see how your API mesh responds to it.

To get started with this transform, install it from npm:

```
yarn add @graphql-mesh/transform-snapshot
```

## How to use?

Add the following configuration to your Mesh config file:

```yml
transforms:
  - snapshot:
      if: "process.env.NODE_ENV != 'production'"
      apply: 
        - Query.*
      outputDir: __snapshots__
```

The following snapshot will work if you are in development environment (see the `if` command).

To modify your snapshots and change the responses, go to `__snapshots__` and modify the responses under those files. 

## Config API Reference

{@import ../generated-markdown/SnapshotTransformConfig.generated.md}
