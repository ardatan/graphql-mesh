---
title: 'NamingConventionTransform'
---

# Class: NamingConventionTransform

[transforms/naming-convention/src](../modules/transforms_naming_convention_src).NamingConventionTransform

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_naming_convention_src.NamingConventionTransform#constructor)

### Methods

- [transformRequest](transforms_naming_convention_src.NamingConventionTransform#transformrequest)
- [transformResult](transforms_naming_convention_src.NamingConventionTransform#transformresult)
- [transformSchema](transforms_naming_convention_src.NamingConventionTransform#transformschema)

## Constructors

### constructor

• **new NamingConventionTransform**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)<[`NamingConventionTransformConfig`](/docs/api/interfaces/types_src.YamlConfig.NamingConventionTransformConfig)\> |

#### Defined in

[packages/transforms/naming-convention/src/index.ts:55](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/naming-convention/src/index.ts#L55)

## Methods

### transformRequest

▸ **transformRequest**(`originalRequest`, `delegationContext`, `transformationContext`): `ExecutionRequest`<`Record`<`string`, `any`\>, `any`, `any`, `Record`<`string`, `any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalRequest` | `ExecutionRequest`<`Record`<`string`, `any`\>, `any`, `any`, `Record`<`string`, `any`\>\> |
| `delegationContext` | `DelegationContext`<`Record`<`string`, `any`\>\> |
| `transformationContext` | `Record`<`string`, `any`\> |

#### Returns

`ExecutionRequest`<`Record`<`string`, `any`\>, `any`, `any`, `Record`<`string`, `any`\>\>

#### Implementation of

MeshTransform.transformRequest

#### Defined in

[packages/transforms/naming-convention/src/index.ts:92](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/naming-convention/src/index.ts#L92)

___

### transformResult

▸ **transformResult**(`originalResult`, `delegationContext`, `transformationContext`): `ExecutionResult`<`Record`<`string`, `any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalResult` | `ExecutionResult`<`Record`<`string`, `any`\>\> |
| `delegationContext` | `DelegationContext`<`Record`<`string`, `any`\>\> |
| `transformationContext` | `any` |

#### Returns

`ExecutionResult`<`Record`<`string`, `any`\>\>

#### Implementation of

MeshTransform.transformResult

#### Defined in

[packages/transforms/naming-convention/src/index.ts:100](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/naming-convention/src/index.ts#L100)

___

### transformSchema

▸ **transformSchema**(`originalWrappingSchema`, `subschemaConfig`, `transformedSchema?`): `GraphQLSchema`

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalWrappingSchema` | `GraphQLSchema` |
| `subschemaConfig` | `SubschemaConfig`<`any`, `any`, `any`, `Record`<`string`, `any`\>\> |
| `transformedSchema?` | `GraphQLSchema` |

#### Returns

`GraphQLSchema`

#### Implementation of

MeshTransform.transformSchema

#### Defined in

[packages/transforms/naming-convention/src/index.ts:84](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/naming-convention/src/index.ts#L84)
