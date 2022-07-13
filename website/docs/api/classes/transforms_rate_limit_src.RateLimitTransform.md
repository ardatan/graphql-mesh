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
| `options` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)<[`RateLimitTransformConfig`](/docs/api/interfaces/types_src.YamlConfig.RateLimitTransformConfig)[]\> |

## Methods

### transformRequest

▸ **transformRequest**(`executionRequest`, `delegationContext`): `ExecutionRequest`<`Record`<`string`, `any`\>, `any`, `any`, `Record`<`string`, `any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `executionRequest` | `ExecutionRequest`<`Record`<`string`, `any`\>, `any`, `any`, `Record`<`string`, `any`\>\> |
| `delegationContext` | `DelegationContext`<`Record`<`string`, `any`\>\> |

#### Returns

`ExecutionRequest`<`Record`<`string`, `any`\>, `any`, `any`, `Record`<`string`, `any`\>\>

#### Implementation of

MeshTransform.transformRequest

___

### transformResult

▸ **transformResult**(`result`, `delegationContext`): `ExecutionResult`<`ObjMap`<`unknown`\>, `ObjMap`<`unknown`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `result` | `ExecutionResult`<`ObjMap`<`unknown`\>, `ObjMap`<`unknown`\>\> |
| `delegationContext` | `DelegationContext`<`Record`<`string`, `any`\>\> |

#### Returns

`ExecutionResult`<`ObjMap`<`unknown`\>, `ObjMap`<`unknown`\>\>

#### Implementation of

MeshTransform.transformResult
