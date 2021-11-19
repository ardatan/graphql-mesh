---
title: 'CacheEffectingOperationConfig'
---

# Interface: CacheEffectingOperationConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).CacheEffectingOperationConfig

## Table of contents

### Properties

- [matchKey](types_src.YamlConfig.CacheEffectingOperationConfig#matchkey)
- [operation](types_src.YamlConfig.CacheEffectingOperationConfig#operation)

## Properties

### matchKey

• `Optional` **matchKey**: `string`

Cache key to invalidate on sucessful resolver (no error), see `cacheKey` for list of available options in this field.

#### Defined in

[packages/types/src/config.ts:1049](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1049)

___

### operation

• **operation**: `string`

Path to the operation that could effect it. In a form: Mutation.something. Note that wildcard is not supported in this field.

#### Defined in

[packages/types/src/config.ts:1045](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1045)
