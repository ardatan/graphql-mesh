---
title: 'MockingTransform'
---

# Class: MockingTransform

[transforms/mock/src](../modules/transforms_mock_src).MockingTransform

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_mock_src.MockingTransform#constructor)

### Properties

- [noWrap](transforms_mock_src.MockingTransform#nowrap)

### Methods

- [transformSchema](transforms_mock_src.MockingTransform#transformschema)

## Constructors

### constructor

• **new MockingTransform**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)<[`MockingConfig`](/docs/api/interfaces/types_src.YamlConfig.MockingConfig)\> |

#### Defined in

[packages/transforms/mock/src/index.ts:15](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/mock/src/index.ts#L15)

## Properties

### noWrap

• **noWrap**: `boolean` = `true`

#### Implementation of

[MeshTransform](/docs/api/interfaces/types_src.MeshTransform).[noWrap](/docs/api/interfaces/types_src.MeshTransform#nowrap)

#### Defined in

[packages/transforms/mock/src/index.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/mock/src/index.ts#L10)

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

[packages/transforms/mock/src/index.ts:21](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/mock/src/index.ts#L21)
