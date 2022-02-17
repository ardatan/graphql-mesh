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

[packages/transforms/mock/src/index.ts:16](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/mock/src/index.ts#L16)

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

[packages/transforms/mock/src/index.ts:22](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/mock/src/index.ts#L22)
