---
title: 'MeshMerger'
---

# Interface: MeshMerger

[types/src](../modules/types_src).MeshMerger

## Implemented by

- [`BareMerger`](/docs/api/classes/mergers_bare_src.BareMerger)
- [`FederationMerger`](/docs/api/classes/mergers_federation_src.FederationMerger)
- [`StitchingMerger`](/docs/api/classes/mergers_stitching_src.StitchingMerger)

## Table of contents

### Properties

- [name](types_src.MeshMerger#name)

### Methods

- [getUnifiedSchema](types_src.MeshMerger#getunifiedschema)

## Properties

### name

• **name**: `string`

#### Defined in

[packages/types/src/index.ts:112](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L112)

## Methods

### getUnifiedSchema

▸ **getUnifiedSchema**(`mergerContext`): `GraphQLSchema` \| `Promise`<`GraphQLSchema`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `mergerContext` | [`MeshMergerContext`](types_src.MeshMergerContext) |

#### Returns

`GraphQLSchema` \| `Promise`<`GraphQLSchema`\>

#### Defined in

[packages/types/src/index.ts:113](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L113)
