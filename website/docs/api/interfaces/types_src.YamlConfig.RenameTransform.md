---
title: 'RenameTransform'
---

# Interface: RenameTransform

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).RenameTransform

## Table of contents

### Properties

- [mode](types_src.YamlConfig.RenameTransform#mode)
- [renames](types_src.YamlConfig.RenameTransform#renames)

## Properties

### mode

• `Optional` **mode**: ``"wrap"`` \| ``"bare"``

Specify to apply rename transforms to bare schema or by wrapping original schema (Allowed values: bare, wrap)

#### Defined in

[packages/types/src/config.ts:1274](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1274)

___

### renames

• **renames**: [`RenameTransformObject`](types_src.YamlConfig.RenameTransformObject)[]

Array of rename rules

#### Defined in

[packages/types/src/config.ts:1278](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1278)
