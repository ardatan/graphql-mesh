---
title: 'RateLimitTransform'
---

# Class: RateLimitTransform

[transforms/rate-limit/src](../modules/transforms_rate_limit_src).RateLimitTransform

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_rate_limit_src.RateLimitTransform#constructor)

### Methods

- [transformRequest](transforms_rate_limit_src.RateLimitTransform#transformrequest)
- [transformResult](transforms_rate_limit_src.RateLimitTransform#transformresult)

## Constructors

### constructor

• **new RateLimitTransform**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)\<[`RateLimitTransformConfig`](/docs/api/interfaces/types_src.YamlConfig.RateLimitTransformConfig)[]> |

#### Defined in

[packages/transforms/rate-limit/src/index.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/rate-limit/src/index.ts#L11)

## Methods

### transformRequest

▸ **transformRequest**(`executionRequest`, `delegationContext`): `ExecutionRequest`\<`Record`\<`string`, `any`>, `any`, `any`, `Record`\<`string`, `any`>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `executionRequest` | `ExecutionRequest`\<`Record`\<`string`, `any`>, `any`, `any`, `Record`\<`string`, `any`>> |
| `delegationContext` | `DelegationContext`\<`Record`\<`string`, `any`>> |

#### Returns

`ExecutionRequest`\<`Record`\<`string`, `any`>, `any`, `any`, `Record`\<`string`, `any`>>

#### Implementation of

MeshTransform.transformRequest

#### Defined in

[packages/transforms/rate-limit/src/index.ts:28](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/rate-limit/src/index.ts#L28)

___

### transformResult

▸ **transformResult**(`result`, `delegationContext`): `ExecutionResult`\<`ObjMap`\<`unknown`>, `ObjMap`\<`unknown`>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `result` | `ExecutionResult`\<`ObjMap`\<`unknown`>, `ObjMap`\<`unknown`>> |
| `delegationContext` | `DelegationContext`\<`Record`\<`string`, `any`>> |

#### Returns

`ExecutionResult`\<`ObjMap`\<`unknown`>, `ObjMap`\<`unknown`>>

#### Implementation of

MeshTransform.transformResult

#### Defined in

[packages/transforms/rate-limit/src/index.ts:92](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/rate-limit/src/index.ts#L92)
