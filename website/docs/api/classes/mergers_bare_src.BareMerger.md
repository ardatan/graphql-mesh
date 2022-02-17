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

[packages/mergers/bare/src/index.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/bare/src/index.ts#L11)

## Properties

### name

• **name**: `string` = `'bare'`

#### Implementation of

[MeshMerger](/docs/api/interfaces/types_src.MeshMerger).[name](/docs/api/interfaces/types_src.MeshMerger#name)

#### Defined in

[packages/mergers/bare/src/index.ts:9](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/bare/src/index.ts#L9)

## Methods

### getUnifiedSchema

▸ **getUnifiedSchema**(`mergerContext`): `Promise`<`GraphQLSchema`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `mergerContext` | [`MeshMergerContext`](/docs/api/interfaces/types_src.MeshMergerContext) |

#### Returns

`Promise`<`GraphQLSchema`\>

#### Implementation of

[MeshMerger](/docs/api/interfaces/types_src.MeshMerger).[getUnifiedSchema](/docs/api/interfaces/types_src.MeshMerger#getunifiedschema)

#### Defined in

[packages/mergers/bare/src/index.ts:72](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/bare/src/index.ts#L72)

___

### handleSingleSource

▸ **handleSingleSource**(`__namedParameters`): `GraphQLSchema`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MeshMergerContext`](/docs/api/interfaces/types_src.MeshMergerContext) |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/mergers/bare/src/index.ts:15](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/bare/src/index.ts#L15)
