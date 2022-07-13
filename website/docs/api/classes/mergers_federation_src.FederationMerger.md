---
title: 'FederationMerger'
---

# Class: FederationMerger

[mergers/federation/src](../modules/mergers_federation_src).FederationMerger

## Implements

- [`MeshMerger`](/docs/api/interfaces/types_src.MeshMerger)

## Table of contents

### Constructors

- [constructor](mergers_federation_src.FederationMerger#constructor)

### Properties

- [name](mergers_federation_src.FederationMerger#name)

### Methods

- [getUnifiedSchema](mergers_federation_src.FederationMerger#getunifiedschema)

## Constructors

### constructor

• **new FederationMerger**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`MeshMergerOptions`](/docs/api/interfaces/types_src.MeshMergerOptions) |

## Properties

### name

• **name**: `string` = `'federation'`

#### Implementation of

[MeshMerger](/docs/api/interfaces/types_src.MeshMerger).[name](/docs/api/interfaces/types_src.MeshMerger#name)

#### Defined in

[packages/mergers/federation/src/index.ts:20](https://github.com/Urigo/graphql-mesh/blob/master/packages/mergers/federation/src/index.ts#L20)

## Methods

### getUnifiedSchema

▸ **getUnifiedSchema**(`__namedParameters`): `Promise`<{ `executor`: <TReturn\>(`__namedParameters`: `ExecutionRequest`<`Record`<`string`, `any`\>, `any`, `any`, `Record`<`string`, `any`\>\>) => `ExecutionResult`<`TReturn`, `ObjMap`<`unknown`\>\> ; `schema`: `GraphQLSchema` = remoteSchema }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MeshMergerContext`](/docs/api/interfaces/types_src.MeshMergerContext) |

#### Returns

`Promise`<{ `executor`: <TReturn\>(`__namedParameters`: `ExecutionRequest`<`Record`<`string`, `any`\>, `any`, `any`, `Record`<`string`, `any`\>\>) => `ExecutionResult`<`TReturn`, `ObjMap`<`unknown`\>\> ; `schema`: `GraphQLSchema` = remoteSchema }\>

#### Implementation of

[MeshMerger](/docs/api/interfaces/types_src.MeshMerger).[getUnifiedSchema](/docs/api/interfaces/types_src.MeshMerger#getunifiedschema)
