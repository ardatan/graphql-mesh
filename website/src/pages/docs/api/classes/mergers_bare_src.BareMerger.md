---
title: 'BareMerger'
---

# Class: BareMerger

[mergers/bare/src](../modules/mergers_bare_src).BareMerger

## Implements

- [`MeshMerger`](/docs/api/interfaces/types_src.MeshMerger)

## Table of contents

### Constructors

- [constructor](mergers_bare_src.BareMerger#constructor)

### Properties

- [name](mergers_bare_src.BareMerger#name)

### Methods

- [getUnifiedSchema](mergers_bare_src.BareMerger#getunifiedschema)
- [handleSingleSource](mergers_bare_src.BareMerger#handlesinglesource)

## Constructors

### constructor

• **new BareMerger**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`MeshMergerOptions`](/docs/api/interfaces/types_src.MeshMergerOptions) |

#### Defined in

[packages/mergers/bare/src/index.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/bare/src/index.ts#L10)

## Properties

### name

• **name**: `string` = `'bare'`

#### Implementation of

[MeshMerger](/docs/api/interfaces/types_src.MeshMerger).[name](/docs/api/interfaces/types_src.MeshMerger#name)

#### Defined in

[packages/mergers/bare/src/index.ts:8](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/bare/src/index.ts#L8)

## Methods

### getUnifiedSchema

▸ **getUnifiedSchema**(`__namedParameters`): `Promise`\<\{ `batch`: `boolean` ; `contextVariables`: `Record`\<`string`, `string`> ; `executor?`: `Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>> ; `handler`: [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler) ; `merge?`: `Record`\<`string`, `MergedTypeConfig`\<`any`, `any`, `Record`\<`string`, `any`>>> ; `name`: `string` ; `schema`: `GraphQLSchema` ; `transforms`: [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)\<`any`>[]  } \| \{ `schema`: `GraphQLSchema` = unifiedSchema }>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MeshMergerContext`](/docs/api/interfaces/types_src.MeshMergerContext) |

#### Returns

`Promise`\<\{ `batch`: `boolean` ; `contextVariables`: `Record`\<`string`, `string`> ; `executor?`: `Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>> ; `handler`: [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler) ; `merge?`: `Record`\<`string`, `MergedTypeConfig`\<`any`, `any`, `Record`\<`string`, `any`>>> ; `name`: `string` ; `schema`: `GraphQLSchema` ; `transforms`: [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)\<`any`>[]  } \| \{ `schema`: `GraphQLSchema` = unifiedSchema }>

#### Implementation of

[MeshMerger](/docs/api/interfaces/types_src.MeshMerger).[getUnifiedSchema](/docs/api/interfaces/types_src.MeshMerger#getunifiedschema)

#### Defined in

[packages/mergers/bare/src/index.ts:48](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/bare/src/index.ts#L48)

___

### handleSingleSource

▸ **handleSingleSource**(`__namedParameters`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MeshMergerContext`](/docs/api/interfaces/types_src.MeshMergerContext) |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `batch` | `boolean` |
| `contextVariables` | `Record`\<`string`, `string`> |
| `executor?` | `Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>> |
| `handler` | [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler) |
| `merge?` | `Record`\<`string`, `MergedTypeConfig`\<`any`, `any`, `Record`\<`string`, `any`>>> |
| `name` | `string` |
| `schema` | `GraphQLSchema` |
| `transforms` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)\<`any`>[] |

#### Defined in

[packages/mergers/bare/src/index.ts:14](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/bare/src/index.ts#L14)
