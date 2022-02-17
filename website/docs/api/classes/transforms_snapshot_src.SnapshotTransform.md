---
title: 'SnapshotTransform'
---

# Class: SnapshotTransform

[transforms/snapshot/src](../modules/transforms_snapshot_src).SnapshotTransform

## Implements

- [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)

## Table of contents

### Constructors

- [constructor](transforms_snapshot_src.SnapshotTransform#constructor)

### Properties

- [noWrap](transforms_snapshot_src.SnapshotTransform#nowrap)

### Methods

- [transformSchema](transforms_snapshot_src.SnapshotTransform#transformschema)

## Constructors

### constructor

• **new SnapshotTransform**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MeshTransformOptions`](/docs/api/interfaces/types_src.MeshTransformOptions)<[`SnapshotTransformConfig`](/docs/api/interfaces/types_src.YamlConfig.SnapshotTransformConfig)\> |

#### Defined in

[packages/transforms/snapshot/src/index.ts:23](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/snapshot/src/index.ts#L23)

## Properties

### noWrap

• **noWrap**: `boolean` = `true`

#### Implementation of

[MeshTransform](/docs/api/interfaces/types_src.MeshTransform).[noWrap](/docs/api/interfaces/types_src.MeshTransform#nowrap)

#### Defined in

[packages/transforms/snapshot/src/index.ts:18](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/snapshot/src/index.ts#L18)

## Methods

### transformSchema

▸ **transformSchema**(`schema`): `GraphQLSchema`

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | `GraphQLSchema` |

#### Returns

`GraphQLSchema`

#### Implementation of

MeshTransform.transformSchema

#### Defined in

[packages/transforms/snapshot/src/index.ts:29](https://github.com/Urigo/graphql-mesh/blob/master/packages/transforms/snapshot/src/index.ts#L29)
