---
id: inmemory-lru
title: InMemory LRU Cache
sidebar_label: InMemory LRU
---

This caching solution uses an in-memory LRU cache store that is used by default. 
You can learn more about LRU Caching;
[Least_recently_used](https://en.wikipedia.org/wiki/Cache_replacement_policies)

You can configure the maximum cache entries you want to keep.

To get started with this caching strategy, install it from npm:

```
yarn add @graphql-mesh/cache-inmemory-lru
```

## How to use?

```yml
cache:
    inmemoryLRU:
        max: 1000 # This will set the size
```

## Config API Reference

{@import ../generated-markdown/InMemoryLRUConfig.generated.md}
