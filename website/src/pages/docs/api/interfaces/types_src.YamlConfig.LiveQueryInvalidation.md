---
title: 'LiveQueryInvalidation'
---

# Interface: LiveQueryInvalidation

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).LiveQueryInvalidation

## Table of contents

### Properties

- [field](types_src.YamlConfig.LiveQueryInvalidation#field)
- [invalidate](types_src.YamlConfig.LiveQueryInvalidation#invalidate)

## Properties

### field

• **field**: `string`

Path to the operation that could effect it. In a form: Mutation.something. Note that wildcard is not supported in this field.

#### Defined in

[packages/types/src/config.ts:1868](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1868)

___

### invalidate

• **invalidate**: `string`[]

#### Defined in

[packages/types/src/config.ts:1869](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1869)
