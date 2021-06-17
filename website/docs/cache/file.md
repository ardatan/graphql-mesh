---
id: cache-file
title: File Cache
sidebar_label: File
---

This caching strategy will use the file system as the storage.

To get started with this caching strategy, install it from npm:

```
yarn add @graphql-mesh/cache-file
```

## How to use?

```yml
cache:
    file: 
        path: ./my-cache.json # the extension should be .json
```

## Config API Reference

{@import ../generated-markdown/FileCacheConfig.generated.md}
