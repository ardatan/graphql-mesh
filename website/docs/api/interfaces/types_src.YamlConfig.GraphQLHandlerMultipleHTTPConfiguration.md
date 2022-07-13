---
title: 'GraphQLHandlerMultipleHTTPConfiguration'
---

# Interface: GraphQLHandlerMultipleHTTPConfiguration

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).GraphQLHandlerMultipleHTTPConfiguration

## Table of contents

### Properties

- [sources](types_src.YamlConfig.GraphQLHandlerMultipleHTTPConfiguration#sources)
- [strategy](types_src.YamlConfig.GraphQLHandlerMultipleHTTPConfiguration#strategy)
- [strategyConfig](types_src.YamlConfig.GraphQLHandlerMultipleHTTPConfiguration#strategyconfig)

## Properties

### sources

• **sources**: [`GraphQLHandlerHTTPConfiguration`](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration)[]

HTTP Source Configurations

#### Defined in

[packages/types/src/config.ts:308](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L308)

___

### strategy

• `Optional` **strategy**: ``"fallback"`` \| ``"race"`` \| ``"highestValue"``

Handling strategy (default: fallback) (Allowed values: fallback, race, highestValue)

#### Defined in

[packages/types/src/config.ts:312](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L312)

___

### strategyConfig

• `Optional` **strategyConfig**: [`GraphQLHandlerhighestValueStrategyConfig`](types_src.YamlConfig.GraphQLHandlerhighestValueStrategyConfig)

#### Defined in

[packages/types/src/config.ts:313](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L313)
