---
title: 'StitchingMerger'
---

# Class: StitchingMerger

[mergers/stitching/src](../modules/mergers_stitching_src).StitchingMerger

## Implements

- [`MeshMerger`](/docs/api/interfaces/types_src.MeshMerger)

## Table of contents

### Constructors

- [constructor](mergers_stitching_src.StitchingMerger#constructor)

### Properties

- [name](mergers_stitching_src.StitchingMerger#name)

### Methods

- [getUnifiedSchema](mergers_stitching_src.StitchingMerger#getunifiedschema)

## Constructors

### constructor

• **new StitchingMerger**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`MeshMergerOptions`](/docs/api/interfaces/types_src.MeshMergerOptions) |

#### Defined in

[packages/mergers/stitching/src/index.ts:34](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/stitching/src/index.ts#L34)

## Properties

### name

• **name**: `string` = `'stitching'`

#### Implementation of

[MeshMerger](/docs/api/interfaces/types_src.MeshMerger).[name](/docs/api/interfaces/types_src.MeshMerger#name)

#### Defined in

[packages/mergers/stitching/src/index.ts:31](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/stitching/src/index.ts#L31)

## Methods

### getUnifiedSchema

▸ **getUnifiedSchema**(`context`): `Promise`<`GraphQLSchema`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `context` | [`MeshMergerContext`](/docs/api/interfaces/types_src.MeshMergerContext) |

#### Returns

`Promise`<`GraphQLSchema`\>

#### Implementation of

[MeshMerger](/docs/api/interfaces/types_src.MeshMerger).[getUnifiedSchema](/docs/api/interfaces/types_src.MeshMerger#getunifiedschema)

#### Defined in

[packages/mergers/stitching/src/index.ts:94](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/stitching/src/index.ts#L94)
