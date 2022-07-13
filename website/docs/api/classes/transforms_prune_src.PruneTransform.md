---
title: 'PruneTransform'
---

# Class: PruneTransform

[transforms/prune/src](../modules/transforms_prune_src).PruneTransform

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_prune_src.PruneTransform#constructor)

### Properties

- [noWrap](transforms_prune_src.PruneTransform#nowrap)

### Methods

- [transformSchema](transforms_prune_src.PruneTransform#transformschema)

## Constructors

### constructor

• **new PruneTransform**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)\<[`PruneTransformConfig`](/docs/api/interfaces/types_src.YamlConfig.PruneTransformConfig)> |

## Properties

### noWrap

• **noWrap**: `boolean` = `true`

#### Implementation of

[MeshTransform](/docs/api/interfaces/types_src.MeshTransform).[noWrap](/docs/api/interfaces/types_src.MeshTransform#nowrap)

#### Defined in

[packages/transforms/prune/src/index.ts:6](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/prune/src/index.ts#L6)

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
