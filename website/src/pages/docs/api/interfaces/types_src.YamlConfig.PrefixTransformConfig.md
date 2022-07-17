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
- [includeTypes](types_src.YamlConfig.PrefixTransformConfig#includetypes)
- [mode](types_src.YamlConfig.PrefixTransformConfig#mode)
- [value](types_src.YamlConfig.PrefixTransformConfig#value)

## Properties

### ignore

• `Optional` **ignore**: `string`[]

List of ignored types

#### Defined in

[packages/types/src/config.ts:1498](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1498)

___

### includeRootOperations

• `Optional` **includeRootOperations**: `boolean`

Changes root types and changes the field names (default: false)

#### Defined in

[packages/types/src/config.ts:1502](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1502)

___

### includeTypes

• `Optional` **includeTypes**: `boolean`

Changes types (default: true)

#### Defined in

[packages/types/src/config.ts:1506](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1506)

___

### mode

• `Optional` **mode**: ``"bare"`` \| ``"wrap"``

Specify to apply prefix transform to bare schema or by wrapping original schema (Allowed values: bare, wrap)

#### Defined in

[packages/types/src/config.ts:1490](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1490)

___

### value

• `Optional` **value**: `string`

The prefix to apply to the schema types. By default it's the API name.

#### Defined in

[packages/types/src/config.ts:1494](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1494)
