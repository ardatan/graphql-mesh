---
title: 'MeshTransform'
---

# Interface: MeshTransform

[types/src](../modules/types_src).MeshTransform

## Hierarchy

- `Transform`

  ↳ **`MeshTransform`**

## Implemented by

- [`CacheTransform`](/docs/api/classes/transforms_cache_src.CacheTransform)
- [`EncapsulateTransform`](/docs/api/classes/transforms_encapsulate_src.EncapsulateTransform)
- [`ExtendTransform`](/docs/api/classes/transforms_extend_src.ExtendTransform)
- [`FederationTransform`](/docs/api/classes/transforms_federation_src.FederationTransform)
- [`MockingTransform`](/docs/api/classes/transforms_mock_src.MockingTransform)
- [`NamingConventionTransform`](/docs/api/classes/transforms_naming_convention_src.NamingConventionTransform)
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

[packages/types/src/index.ts:86](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L86)

___

### transformRequest

• `Optional` **transformRequest**: `RequestTransform`<`any`\>

#### Inherited from

Transform.transformRequest

#### Defined in

node_modules/@graphql-tools/delegate/types.d.ts:11

___

### transformResult

• `Optional` **transformResult**: `ResultTransform`<`any`\>

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
