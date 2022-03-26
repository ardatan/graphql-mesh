---
title: 'GraphQLHandlerMultipleHTTPConfiguration'
---

# Interface: GraphQLHandlerMultipleHTTPConfiguration

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).GraphQLHandlerMultipleHTTPConfiguration

## Table of contents

### Properties

- [sources](types_src.YamlConfig.GraphQLHandlerMultipleHTTPConfiguration#sources)
- [strategy](types_src.YamlConfig.GraphQLHandlerMultipleHTTPConfiguration#strategy)

## Properties

### sources

• **sources**: [`GraphQLHandlerHTTPConfiguration`](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration)[]

HTTP Source Configurations

#### Defined in

[packages/types/src/config.ts:299](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L299)

___

### strategy

• `Optional` **strategy**: ``"fallback"`` \| ``"race"``

Handling strategy (default: fallback) (Allowed values: fallback, race)

#### Defined in

[packages/types/src/config.ts:303](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L303)
