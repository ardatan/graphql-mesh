---
title: 'CacheTransform'
---

# Class: CacheTransform

[transforms/cache/src](../modules/transforms_cache_src).CacheTransform

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_cache_src.CacheTransform#constructor)

### Properties

- [noWrap](transforms_cache_src.CacheTransform#nowrap)

### Methods

- [transformSchema](transforms_cache_src.CacheTransform#transformschema)

## Constructors

### constructor

• **new CacheTransform**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)<[`CacheTransformConfig`](/docs/api/interfaces/types_src.YamlConfig.CacheTransformConfig)[]\> |

#### Defined in

[packages/transforms/cache/src/index.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/cache/src/index.ts#L10)

## Properties

### noWrap

• **noWrap**: `boolean` = `true`

#### Implementation of

[MeshTransform](/docs/api/interfaces/types_src.MeshTransform).[noWrap](/docs/api/interfaces/types_src.MeshTransform#nowrap)

#### Defined in

[packages/transforms/cache/src/index.ts:9](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/cache/src/index.ts#L9)

## Methods

### transformSchema

▸ **transformSchema**(`schema`): `GraphQLSchema`

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | `GraphQLSchema` |

#### Returns

`GraphQLSchema`

#### Implementation of

MeshTransform.transformSchema

#### Defined in

[packages/transforms/cache/src/index.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/cache/src/index.ts#L11)
