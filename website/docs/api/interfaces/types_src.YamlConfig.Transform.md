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
- [mock](types_src.YamlConfig.Transform#mock)
- [namingConvention](types_src.YamlConfig.Transform#namingconvention)
- [prefix](types_src.YamlConfig.Transform#prefix)
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

[packages/types/src/config.ts:981](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L981)

___

### encapsulate

• `Optional` **encapsulate**: [`EncapsulateTransformObject`](types_src.YamlConfig.EncapsulateTransformObject)

#### Defined in

[packages/types/src/config.ts:982](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L982)

___

### extend

• `Optional` **extend**: [`ExtendTransform`](types_src.YamlConfig.ExtendTransform)

#### Defined in

[packages/types/src/config.ts:983](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L983)

___

### federation

• `Optional` **federation**: [`FederationTransform`](types_src.YamlConfig.FederationTransform)

#### Defined in

[packages/types/src/config.ts:984](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L984)

___

### filterSchema

• `Optional` **filterSchema**: `any`

Transformer to filter (white/black list) GraphQL types, fields and arguments (Any of: FilterSchemaTransform, Any)

#### Defined in

[packages/types/src/config.ts:988](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L988)

___

### mock

• `Optional` **mock**: [`MockingConfig`](types_src.YamlConfig.MockingConfig)

#### Defined in

[packages/types/src/config.ts:989](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L989)

___

### namingConvention

• `Optional` **namingConvention**: [`NamingConventionTransformConfig`](types_src.YamlConfig.NamingConventionTransformConfig)

#### Defined in

[packages/types/src/config.ts:990](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L990)

___

### prefix

• `Optional` **prefix**: [`PrefixTransformConfig`](types_src.YamlConfig.PrefixTransformConfig)

#### Defined in

[packages/types/src/config.ts:991](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L991)

___

### rename

• `Optional` **rename**: `any`

Transformer to rename GraphQL types and fields (Any of: RenameTransform, Any)

#### Defined in

[packages/types/src/config.ts:995](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L995)

___

### replaceField

• `Optional` **replaceField**: [`ReplaceFieldTransformConfig`](types_src.YamlConfig.ReplaceFieldTransformConfig)

#### Defined in

[packages/types/src/config.ts:996](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L996)

___

### resolversComposition

• `Optional` **resolversComposition**: `any`

Transformer to apply composition to resolvers (Any of: ResolversCompositionTransform, Any)

#### Defined in

[packages/types/src/config.ts:1000](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1000)

___

### snapshot

• `Optional` **snapshot**: [`SnapshotTransformConfig`](types_src.YamlConfig.SnapshotTransformConfig)

#### Defined in

[packages/types/src/config.ts:1001](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1001)

___

### typeMerging

• `Optional` **typeMerging**: [`TypeMergingConfig`](types_src.YamlConfig.TypeMergingConfig)

#### Defined in

[packages/types/src/config.ts:1002](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1002)
