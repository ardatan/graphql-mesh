---
title: 'MeshHoistField'
---

# Class: MeshHoistField

[transforms/hoist-field/src](../modules/transforms_hoist_field_src).MeshHoistField

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_hoist_field_src.MeshHoistField#constructor)

### Properties

- [noWrap](transforms_hoist_field_src.MeshHoistField#nowrap)

### Methods

- [transformRequest](transforms_hoist_field_src.MeshHoistField#transformrequest)
- [transformResult](transforms_hoist_field_src.MeshHoistField#transformresult)
- [transformSchema](transforms_hoist_field_src.MeshHoistField#transformschema)

## Constructors

### constructor

• **new MeshHoistField**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)\<[`HoistFieldTransformConfig`](/docs/api/interfaces/types_src.YamlConfig.HoistFieldTransformConfig)[]> |

## Properties

### noWrap

• **noWrap**: `boolean` = `false`

#### Implementation of

[MeshTransform](/docs/api/interfaces/types_src.MeshTransform).[noWrap](/docs/api/interfaces/types_src.MeshTransform#nowrap)

#### Defined in

[packages/transforms/hoist-field/src/index.ts:12](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/hoist-field/src/index.ts#L12)

## Methods

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
