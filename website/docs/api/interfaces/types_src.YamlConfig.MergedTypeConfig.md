---
title: 'MergedTypeConfig'
---

# Interface: MergedTypeConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).MergedTypeConfig

## Table of contents

### Properties

- [canonical](types_src.YamlConfig.MergedTypeConfig#canonical)
- [fields](types_src.YamlConfig.MergedTypeConfig#fields)
- [key](types_src.YamlConfig.MergedTypeConfig#key)
- [typeName](types_src.YamlConfig.MergedTypeConfig#typename)

## Properties

### canonical

• `Optional` **canonical**: `boolean`

Specifies types and fields
that provide a [canonical definition](https://www.graphql-tools.com/docs/stitch-type-merging#canonical-definitions) to be built into the gateway schema. Useful for selecting preferred characteristics among types and fields that overlap across subschemas. Root fields marked as canonical specify which subschema the field proxies for new queries entering the graph.

#### Defined in

[packages/types/src/config.ts:1413](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1413)

___

### fields

• `Optional` **fields**: [`MergedTypeField`](types_src.YamlConfig.MergedTypeField)[]

#### Defined in

[packages/types/src/config.ts:1414](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1414)

___

### key

• `Optional` **key**: [`KeyAnnotation`](types_src.YamlConfig.KeyAnnotation)

#### Defined in

[packages/types/src/config.ts:1408](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1408)

___

### typeName

• `Optional` **typeName**: `string`

Name of the type (Query by default)

#### Defined in

[packages/types/src/config.ts:1407](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1407)
