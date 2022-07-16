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

[packages/types/src/config.ts:1495](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1495)

___

### includeRootOperations

• `Optional` **includeRootOperations**: `boolean`

Changes root types and changes the field names (default: false)

#### Defined in

[packages/types/src/config.ts:1499](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1499)

___

### includeTypes

• `Optional` **includeTypes**: `boolean`

Changes types (default: true)

#### Defined in

[packages/types/src/config.ts:1503](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1503)

___

### mode

• `Optional` **mode**: ``"bare"`` \| ``"wrap"``

Specify to apply prefix transform to bare schema or by wrapping original schema (Allowed values: bare, wrap)

#### Defined in

[packages/types/src/config.ts:1487](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1487)

___

### value

• `Optional` **value**: `string`

The prefix to apply to the schema types. By default it's the API name.

#### Defined in

[packages/types/src/config.ts:1491](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1491)
