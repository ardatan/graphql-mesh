---
title: 'ExtendTransform'
---

# Class: ExtendTransform

[transforms/extend/src](../modules/transforms_extend_src).ExtendTransform

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_extend_src.ExtendTransform#constructor)

### Properties

- [noWrap](transforms_extend_src.ExtendTransform#nowrap)

### Methods

- [transformSchema](transforms_extend_src.ExtendTransform#transformschema)

## Constructors

### constructor

• **new ExtendTransform**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)<[`ExtendTransform`](/docs/api/interfaces/types_src.YamlConfig.ExtendTransform)\> |

## Properties

### noWrap

• **noWrap**: `boolean` = `true`

#### Implementation of

[MeshTransform](/docs/api/interfaces/types_src.MeshTransform).[noWrap](/docs/api/interfaces/types_src.MeshTransform#nowrap)

#### Defined in

[packages/transforms/extend/src/index.ts:40](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/extend/src/index.ts#L40)

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
