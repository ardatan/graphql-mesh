---
title: 'FilterSchemaTransform'
---

# Interface: FilterSchemaTransform

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).FilterSchemaTransform

## Table of contents

### Properties

- [filters](types_src.YamlConfig.FilterSchemaTransform#filters)
- [mode](types_src.YamlConfig.FilterSchemaTransform#mode)

## Properties

### filters

• **filters**: `string`[]

Array of filter rules

#### Defined in

[packages/types/src/config.ts:1117](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1117)

___

### mode

• `Optional` **mode**: ``"wrap"`` \| ``"bare"``

Specify to apply filter-schema transforms to bare schema or by wrapping original schema (Allowed values: bare, wrap)

#### Defined in

[packages/types/src/config.ts:1113](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1113)
