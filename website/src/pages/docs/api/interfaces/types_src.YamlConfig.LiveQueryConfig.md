---
title: 'LiveQueryConfig'
---

# Interface: LiveQueryConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).LiveQueryConfig

## Table of contents

### Properties

- [invalidations](types_src.YamlConfig.LiveQueryConfig#invalidations)
- [polling](types_src.YamlConfig.LiveQueryConfig#polling)

## Properties

### invalidations

• `Optional` **invalidations**: [`LiveQueryInvalidation`](types_src.YamlConfig.LiveQueryInvalidation)[]

Invalidate a query or queries when a specific operation is done without an error

#### Defined in

[packages/types/src/config.ts:1858](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1858)

___

### polling

• `Optional` **polling**: [`LiveQueryPolling`](types_src.YamlConfig.LiveQueryPolling)[]

Allow an operation can be used a live query with polling

#### Defined in

[packages/types/src/config.ts:1862](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1862)
