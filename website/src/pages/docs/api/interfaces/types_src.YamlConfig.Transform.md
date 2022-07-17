---
title: 'Transform'
---

# Interface: Transform

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).Transform

## Indexable

▪ [k: `string`]: `any`

## Table of contents

### Properties

- [cache](types_src.YamlConfig.Transform#cache)
- [encapsulate](types_src.YamlConfig.Transform#encapsulate)
- [extend](types_src.YamlConfig.Transform#extend)
- [federation](types_src.YamlConfig.Transform#federation)
- [filterSchema](types_src.YamlConfig.Transform#filterschema)
- [hoistField](types_src.YamlConfig.Transform#hoistfield)
- [mock](types_src.YamlConfig.Transform#mock)
- [namingConvention](types_src.YamlConfig.Transform#namingconvention)
- [prefix](types_src.YamlConfig.Transform#prefix)
- [prune](types_src.YamlConfig.Transform#prune)
- [rateLimit](types_src.YamlConfig.Transform#ratelimit)
- [rename](types_src.YamlConfig.Transform#rename)
- [replaceField](types_src.YamlConfig.Transform#replacefield)
- [resolversComposition](types_src.YamlConfig.Transform#resolverscomposition)
- [snapshot](types_src.YamlConfig.Transform#snapshot)
- [typeMerging](types_src.YamlConfig.Transform#typemerging)

## Properties

### cache

• `Optional` **cache**: [`CacheTransformConfig`](types_src.YamlConfig.CacheTransformConfig)[]

Transformer to apply caching for your data sources

#### Defined in

[packages/types/src/config.ts:1161](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1161)

___

### encapsulate

• `Optional` **encapsulate**: [`EncapsulateTransformObject`](types_src.YamlConfig.EncapsulateTransformObject)

#### Defined in

[packages/types/src/config.ts:1162](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1162)

___

### extend

• `Optional` **extend**: [`ExtendTransform`](types_src.YamlConfig.ExtendTransform)

#### Defined in

[packages/types/src/config.ts:1163](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1163)

___

### federation

• `Optional` **federation**: [`FederationTransform`](types_src.YamlConfig.FederationTransform)

#### Defined in

[packages/types/src/config.ts:1164](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1164)

___

### filterSchema

• `Optional` **filterSchema**: `any`

Transformer to filter (white/black list) GraphQL types, fields and arguments (Any of: FilterSchemaTransform, Any)

#### Defined in

[packages/types/src/config.ts:1168](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1168)

___

### hoistField

• `Optional` **hoistField**: [`HoistFieldTransformConfig`](types_src.YamlConfig.HoistFieldTransformConfig)[]

Transformer to hoist GraphQL fields

#### Defined in

[packages/types/src/config.ts:1172](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1172)

___

### mock

• `Optional` **mock**: [`MockingConfig`](types_src.YamlConfig.MockingConfig)

#### Defined in

[packages/types/src/config.ts:1173](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1173)

___

### namingConvention

• `Optional` **namingConvention**: [`NamingConventionTransformConfig`](types_src.YamlConfig.NamingConventionTransformConfig)

#### Defined in

[packages/types/src/config.ts:1174](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1174)

___

### prefix

• `Optional` **prefix**: [`PrefixTransformConfig`](types_src.YamlConfig.PrefixTransformConfig)

#### Defined in

[packages/types/src/config.ts:1175](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1175)

___

### prune

• `Optional` **prune**: [`PruneTransformConfig`](types_src.YamlConfig.PruneTransformConfig)

#### Defined in

[packages/types/src/config.ts:1176](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1176)

___

### rateLimit

• `Optional` **rateLimit**: [`RateLimitTransformConfig`](types_src.YamlConfig.RateLimitTransformConfig)[]

RateLimit transform

#### Defined in

[packages/types/src/config.ts:1180](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1180)

___

### rename

• `Optional` **rename**: `any`

Transformer to rename GraphQL types and fields (Any of: RenameTransform, Any)

#### Defined in

[packages/types/src/config.ts:1184](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1184)

___

### replaceField

• `Optional` **replaceField**: [`ReplaceFieldTransformConfig`](types_src.YamlConfig.ReplaceFieldTransformConfig)

#### Defined in

[packages/types/src/config.ts:1185](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1185)

___

### resolversComposition

• `Optional` **resolversComposition**: `any`

Transformer to apply composition to resolvers (Any of: ResolversCompositionTransform, Any)

#### Defined in

[packages/types/src/config.ts:1189](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1189)

___

### snapshot

• `Optional` **snapshot**: [`SnapshotTransformConfig`](types_src.YamlConfig.SnapshotTransformConfig)

#### Defined in

[packages/types/src/config.ts:1190](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1190)

___

### typeMerging

• `Optional` **typeMerging**: [`TypeMergingConfig`](types_src.YamlConfig.TypeMergingConfig)

#### Defined in

[packages/types/src/config.ts:1191](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1191)
