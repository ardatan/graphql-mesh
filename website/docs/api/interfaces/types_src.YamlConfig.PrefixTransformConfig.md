---
title: 'PrefixTransformConfig'
---

# Interface: PrefixTransformConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).PrefixTransformConfig

Prefix transform

## Table of contents

### Properties

- [ignore](types_src.YamlConfig.PrefixTransformConfig#ignore)
- [includeRootOperations](types_src.YamlConfig.PrefixTransformConfig#includerootoperations)
- [mode](types_src.YamlConfig.PrefixTransformConfig#mode)
- [value](types_src.YamlConfig.PrefixTransformConfig#value)

## Properties

### ignore

• `Optional` **ignore**: `string`[]

List of ignored types

#### Defined in

[packages/types/src/config.ts:1264](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1264)

___

### includeRootOperations

• `Optional` **includeRootOperations**: `boolean`

Changes root types and changes the field names

#### Defined in

[packages/types/src/config.ts:1268](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1268)

___

### mode

• `Optional` **mode**: ``"wrap"`` \| ``"bare"``

Specify to apply prefix transform to bare schema or by wrapping original schema (Allowed values: bare, wrap)

#### Defined in

[packages/types/src/config.ts:1256](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1256)

___

### value

• `Optional` **value**: `string`

The prefix to apply to the schema types. By default it's the API name.

#### Defined in

[packages/types/src/config.ts:1260](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1260)
