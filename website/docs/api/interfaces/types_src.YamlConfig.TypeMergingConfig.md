---
title: 'TypeMergingConfig'
---

# Interface: TypeMergingConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).TypeMergingConfig

[Type Merging](https://www.graphql-tools.com/docs/stitch-type-merging) Configuration

## Table of contents

### Properties

- [additionalConfiguration](types_src.YamlConfig.TypeMergingConfig#additionalconfiguration)
- [queryFields](types_src.YamlConfig.TypeMergingConfig#queryfields)
- [types](types_src.YamlConfig.TypeMergingConfig#types)

## Properties

### additionalConfiguration

• `Optional` **additionalConfiguration**: `any`

The path to a code file that has additional type merging configuration

#### Defined in

[packages/types/src/config.ts:1401](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1401)

___

### queryFields

• `Optional` **queryFields**: [`MergedRootFieldConfig`](types_src.YamlConfig.MergedRootFieldConfig)[]

Denotes a root field used to query a merged type across services.
The marked field's name is analogous
to the fieldName setting in
[merged type configuration](https://www.graphql-tools.com/docs/stitch-type-merging#basic-example),
while the field's arguments and return type are used to infer merge configuration.
Directive arguments tune the merge behavior

#### Defined in

[packages/types/src/config.ts:1397](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1397)

___

### types

• `Optional` **types**: [`MergedTypeConfig`](types_src.YamlConfig.MergedTypeConfig)[]

#### Defined in

[packages/types/src/config.ts:1388](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1388)
