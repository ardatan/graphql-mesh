---
title: 'FederationTransform'
---

# Class: FederationTransform

[transforms/federation/src](../modules/transforms_federation_src).FederationTransform

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_federation_src.FederationTransform#constructor)

### Methods

- [transformSchema](transforms_federation_src.FederationTransform#transformschema)

## Constructors

### constructor

• **new FederationTransform**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)<[`FederationTransform`](/docs/api/interfaces/types_src.YamlConfig.FederationTransform)\> |

#### Defined in

[packages/transforms/federation/src/index.ts:27](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/federation/src/index.ts#L27)

## Methods

### transformSchema

▸ **transformSchema**(`schema`, `rawSource`): `GraphQLSchema`

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | `GraphQLSchema` |
| `rawSource` | `SubschemaConfig`<`any`, `any`, `any`, `Record`<`string`, `any`\>\> |

#### Returns

`GraphQLSchema`

#### Implementation of

MeshTransform.transformSchema

#### Defined in

[packages/transforms/federation/src/index.ts:34](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/federation/src/index.ts#L34)
