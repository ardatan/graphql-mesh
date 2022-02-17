---
title: 'ComputedAnnotation'
---

# Interface: ComputedAnnotation

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).ComputedAnnotation

specifies a selection of fields required from other services to compute the value of this field.
These additional fields are only selected when the computed field is requested.
Analogous to [computed field](https://www.graphql-tools.com/docs/stitch-type-merging#computed-fields) in merged type configuration.
Computed field dependencies must be sent into the subservice using an [object key](https://www.graphql-tools.com/docs/stitch-directives-sdl#object-keys).

## Table of contents

### Properties

- [selectionSet](types_src.YamlConfig.ComputedAnnotation#selectionset)

## Properties

### selectionSet

• **selectionSet**: `string`

#### Defined in

[packages/types/src/config.ts:1434](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1434)
