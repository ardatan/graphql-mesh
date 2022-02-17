---
title: 'ResolversCompositionTransform'
---

# Class: ResolversCompositionTransform

[transforms/resolvers-composition/src](../modules/transforms_resolvers_composition_src).ResolversCompositionTransform

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_resolvers_composition_src.ResolversCompositionTransform#constructor)

### Properties

- [noWrap](transforms_resolvers_composition_src.ResolversCompositionTransform#nowrap)

### Methods

- [transformSchema](transforms_resolvers_composition_src.ResolversCompositionTransform#transformschema)

## Constructors

### constructor

• **new ResolversCompositionTransform**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)<`any`\> |

#### Defined in

[packages/transforms/resolvers-composition/src/index.ts:13](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/resolvers-composition/src/index.ts#L13)

## Properties

### noWrap

• **noWrap**: `boolean`

#### Implementation of

[MeshTransform](/docs/api/interfaces/types_src.MeshTransform).[noWrap](/docs/api/interfaces/types_src.MeshTransform#nowrap)

#### Defined in

[packages/transforms/resolvers-composition/src/index.ts:8](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/resolvers-composition/src/index.ts#L8)

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

[packages/transforms/resolvers-composition/src/index.ts:20](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/resolvers-composition/src/index.ts#L20)
