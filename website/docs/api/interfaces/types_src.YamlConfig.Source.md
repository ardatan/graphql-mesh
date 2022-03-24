---
title: 'Source'
---

# Interface: Source

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).Source

## Table of contents

### Properties

- [handler](types_src.YamlConfig.Source#handler)
- [name](types_src.YamlConfig.Source#name)
- [transforms](types_src.YamlConfig.Source#transforms)

## Properties

### handler

• **handler**: [`Handler`](types_src.YamlConfig.Handler)

#### Defined in

[packages/types/src/config.ts:193](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L193)

___

### name

• **name**: `string`

The name you wish to set to your remote API, this will be used for building the GraphQL context

#### Defined in

[packages/types/src/config.ts:192](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L192)

___

### transforms

• `Optional` **transforms**: [`Transform`](types_src.YamlConfig.Transform)[]

List of transforms to apply to the current API source, before unifying it with the rest of the sources

#### Defined in

[packages/types/src/config.ts:197](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L197)
