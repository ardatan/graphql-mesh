---
title: 'ReplaceFieldTransform'
---

# Class: ReplaceFieldTransform

[transforms/replace-field/src](../modules/transforms_replace_field_src).ReplaceFieldTransform

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_replace_field_src.ReplaceFieldTransform#constructor)

### Properties

- [noWrap](transforms_replace_field_src.ReplaceFieldTransform#nowrap)

### Methods

- [transformSchema](transforms_replace_field_src.ReplaceFieldTransform#transformschema)

## Constructors

### constructor

• **new ReplaceFieldTransform**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)<[`ReplaceFieldTransformConfig`](/docs/api/interfaces/types_src.YamlConfig.ReplaceFieldTransformConfig)\> |

#### Defined in

[packages/transforms/replace-field/src/index.ts:27](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/replace-field/src/index.ts#L27)

## Properties

### noWrap

• **noWrap**: `boolean` = `true`

#### Implementation of

[MeshTransform](/docs/api/interfaces/types_src.MeshTransform).[noWrap](/docs/api/interfaces/types_src.MeshTransform#nowrap)

#### Defined in

[packages/transforms/replace-field/src/index.ts:21](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/replace-field/src/index.ts#L21)

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

[packages/transforms/replace-field/src/index.ts:62](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/replace-field/src/index.ts#L62)
