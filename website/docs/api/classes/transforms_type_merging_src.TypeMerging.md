---
title: 'TypeMerging'
---

# Class: TypeMerging

[transforms/type-merging/src](../modules/transforms_type_merging_src).TypeMerging

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_type_merging_src.TypeMerging#constructor)

### Properties

- [importFn](transforms_type_merging_src.TypeMerging#importfn)

### Methods

- [transformSchema](transforms_type_merging_src.TypeMerging#transformschema)

## Constructors

### constructor

• **new TypeMerging**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)<[`TypeMergingConfig`](/docs/api/interfaces/types_src.YamlConfig.TypeMergingConfig)\> |

#### Defined in

[packages/transforms/type-merging/src/index.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/type-merging/src/index.ts#L11)

## Properties

### importFn

• **importFn**: [`ImportFn`](../modules/types_src#importfn)

#### Defined in

[packages/transforms/type-merging/src/index.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/type-merging/src/index.ts#L10)

## Methods

### transformSchema

▸ **transformSchema**(`schema`, `subschemaConfig`): `GraphQLSchema`

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | `GraphQLSchema` |
| `subschemaConfig` | `SubschemaConfig`<`any`, `any`, `any`, `Record`<`string`, `any`\>\> |

#### Returns

`GraphQLSchema`

#### Implementation of

MeshTransform.transformSchema

#### Defined in

[packages/transforms/type-merging/src/index.ts:17](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/type-merging/src/index.ts#L17)
