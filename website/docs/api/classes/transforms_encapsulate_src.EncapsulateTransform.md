---
title: 'EncapsulateTransform'
---

# Class: EncapsulateTransform

[transforms/encapsulate/src](../modules/transforms_encapsulate_src).EncapsulateTransform

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_encapsulate_src.EncapsulateTransform#constructor)

### Methods

- [generateSchemaTransforms](transforms_encapsulate_src.EncapsulateTransform#generateschematransforms)
- [transformRequest](transforms_encapsulate_src.EncapsulateTransform#transformrequest)
- [transformResult](transforms_encapsulate_src.EncapsulateTransform#transformresult)
- [transformSchema](transforms_encapsulate_src.EncapsulateTransform#transformschema)

## Constructors

### constructor

• **new EncapsulateTransform**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)\<[`EncapsulateTransformObject`](/docs/api/interfaces/types_src.YamlConfig.EncapsulateTransformObject)> |

## Methods

### generateSchemaTransforms

▸ **generateSchemaTransforms**(`originalWrappingSchema`): `Generator`\<`Transform`\<`any`, `Record`\<`string`, `any`>>, `void`, `unknown`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalWrappingSchema` | `GraphQLSchema` |

#### Returns

`Generator`\<`Transform`\<`any`, `Record`\<`string`, `any`>>, `void`, `unknown`>

___

### transformRequest

▸ **transformRequest**(`originalRequest`, `delegationContext`, `transformationContext`): `ExecutionRequest`\<`Record`\<`string`, `any`>, `any`, `any`, `Record`\<`string`, `any`>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalRequest` | `ExecutionRequest`\<`Record`\<`string`, `any`>, `any`, `any`, `Record`\<`string`, `any`>> |
| `delegationContext` | `DelegationContext`\<`Record`\<`string`, `any`>> |
| `transformationContext` | `Record`\<`string`, `any`> |

#### Returns

`ExecutionRequest`\<`Record`\<`string`, `any`>, `any`, `any`, `Record`\<`string`, `any`>>

#### Implementation of

MeshTransform.transformRequest

___

### transformResult

▸ **transformResult**(`originalResult`, `delegationContext`, `transformationContext`): `ExecutionResult`\<`Record`\<`string`, `any`>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalResult` | `ExecutionResult`\<`Record`\<`string`, `any`>> |
| `delegationContext` | `DelegationContext`\<`Record`\<`string`, `any`>> |
| `transformationContext` | `any` |

#### Returns

`ExecutionResult`\<`Record`\<`string`, `any`>>

#### Implementation of

MeshTransform.transformResult

___

### transformSchema

▸ **transformSchema**(`originalWrappingSchema`, `subschemaConfig`, `transformedSchema?`): `GraphQLSchema`

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalWrappingSchema` | `GraphQLSchema` |
| `subschemaConfig` | `SubschemaConfig`\<`any`, `any`, `any`, `Record`\<`string`, `any`>> |
| `transformedSchema?` | `GraphQLSchema` |

#### Returns

`GraphQLSchema`

#### Implementation of

MeshTransform.transformSchema
