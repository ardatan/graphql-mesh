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

▸ **getUnifiedSchema**(`__namedParameters`): `Promise`\<`GraphQLSchema`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MeshMergerContext`](/docs/api/interfaces/types_src.MeshMergerContext) |

#### Returns

`Promise`\<`GraphQLSchema`>

#### Implementation of

[MeshMerger](/docs/api/interfaces/types_src.MeshMerger).[getUnifiedSchema](/docs/api/interfaces/types_src.MeshMerger#getunifiedschema)

#### Defined in

[packages/mergers/bare/src/index.ts:14](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/bare/src/index.ts#L14)
