---
title: 'CacheInvalidateConfig'
---

# Interface: CacheInvalidateConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).CacheInvalidateConfig

Invalidation rules

## Table of contents

### Properties

- [effectingOperations](types_src.YamlConfig.CacheInvalidateConfig#effectingoperations)
- [ttl](types_src.YamlConfig.CacheInvalidateConfig#ttl)

## Properties

### effectingOperations

• `Optional` **effectingOperations**: [`CacheEffectingOperationConfig`](types_src.YamlConfig.CacheEffectingOperationConfig)[]

Invalidate the cache when a specific operation is done without an error

#### Defined in

[packages/types/src/config.ts:1035](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1035)

___

### ttl

• `Optional` **ttl**: `number`

Specified in seconds, the time-to-live (TTL) value limits the lifespan

#### Defined in

[packages/types/src/config.ts:1039](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1039)
