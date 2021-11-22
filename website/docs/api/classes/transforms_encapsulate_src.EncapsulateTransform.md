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
| `options` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)<[`EncapsulateTransformObject`](/docs/api/interfaces/types_src.YamlConfig.EncapsulateTransformObject)\> |

#### Defined in

[packages/transforms/encapsulate/src/index.ts:20](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/encapsulate/src/index.ts#L20)

## Methods

### generateSchemaTransforms

▸ **generateSchemaTransforms**(`originalWrappingSchema`): `Generator`<`Transform`<`any`, `Record`<`string`, `any`\>\>, `void`, `unknown`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalWrappingSchema` | `GraphQLSchema` |

#### Returns

`Generator`<`Transform`<`any`, `Record`<`string`, `any`\>\>, `void`, `unknown`\>

#### Defined in

[packages/transforms/encapsulate/src/index.ts:43](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/encapsulate/src/index.ts#L43)

___

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

[packages/transforms/encapsulate/src/index.ts:61](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/encapsulate/src/index.ts#L61)

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

[packages/transforms/encapsulate/src/index.ts:69](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/encapsulate/src/index.ts#L69)

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

[packages/transforms/encapsulate/src/index.ts:52](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/encapsulate/src/index.ts#L52)
