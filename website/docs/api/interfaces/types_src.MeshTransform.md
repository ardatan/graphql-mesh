---
title: 'MeshTransform'
---

# Interface: MeshTransform<T\>

[types/src](../modules/types_src).MeshTransform

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `any` |

## Hierarchy

- `Transform`<`T`\>

  ↳ **`MeshTransform`**

## Implemented by

- [`CacheTransform`](/docs/api/classes/transforms_cache_src.CacheTransform)
- [`EncapsulateTransform`](/docs/api/classes/transforms_encapsulate_src.EncapsulateTransform)
- [`ExtendTransform`](/docs/api/classes/transforms_extend_src.ExtendTransform)
- [`FederationTransform`](/docs/api/classes/transforms_federation_src.FederationTransform)
- [`MeshHoistField`](/docs/api/classes/transforms_hoist_field_src.MeshHoistField)
- [`MockingTransform`](/docs/api/classes/transforms_mock_src.MockingTransform)
- [`NamingConventionTransform`](/docs/api/classes/transforms_naming_convention_src.NamingConventionTransform)
- [`PruneTransform`](/docs/api/classes/transforms_prune_src.PruneTransform)
- [`RateLimitTransform`](/docs/api/classes/transforms_rate_limit_src.RateLimitTransform)
- [`ReplaceFieldTransform`](/docs/api/classes/transforms_replace_field_src.ReplaceFieldTransform)
- [`ResolversCompositionTransform`](/docs/api/classes/transforms_resolvers_composition_src.ResolversCompositionTransform)
- [`SnapshotTransform`](/docs/api/classes/transforms_snapshot_src.SnapshotTransform)
- [`TypeMerging`](/docs/api/classes/transforms_type_merging_src.TypeMerging)

## Table of contents

### Properties

- [noWrap](types_src.MeshTransform#nowrap)
- [transformRequest](types_src.MeshTransform#transformrequest)
- [transformResult](types_src.MeshTransform#transformresult)
- [transformSchema](types_src.MeshTransform#transformschema)

## Properties

### noWrap

• `Optional` **noWrap**: `boolean`

#### Defined in

[packages/types/src/index.ts:83](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L83)

___

### transformRequest

• `Optional` **transformRequest**: `RequestTransform`<`T`, `Record`<`string`, `any`\>\>

#### Inherited from

Transform.transformRequest

#### Defined in

node_modules/@graphql-tools/delegate/types.d.ts:11

___

### transformResult

• `Optional` **transformResult**: `ResultTransform`<`T`, `Record`<`string`, `any`\>\>

#### Inherited from

Transform.transformResult

#### Defined in

node_modules/@graphql-tools/delegate/types.d.ts:12

___

### transformSchema

• `Optional` **transformSchema**: `SchemaTransform`<`Record`<`string`, `any`\>\>

#### Inherited from

Transform.transformSchema

#### Defined in

node_modules/@graphql-tools/delegate/types.d.ts:10
