---
title: 'CacheTransformConfig'
---

# Interface: CacheTransformConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).CacheTransformConfig

## Table of contents

### Properties

- [cacheKey](types_src.YamlConfig.CacheTransformConfig#cachekey)
- [field](types_src.YamlConfig.CacheTransformConfig#field)
- [invalidate](types_src.YamlConfig.CacheTransformConfig#invalidate)

## Properties

### cacheKey

• `Optional` **cacheKey**: `string`

Cache key to use to store your resolvers responses.
The defualt is: {typeName}-{fieldName}-{argsHash}-{fieldNamesHash}

Available variables:
- {args.argName} - use resolver argument
- {typeName} - use name of the type
- {fieldName} - use name of the field
- {argsHash} - a hash based on the 'args' object
- {fieldNamesHash} - a hash based on the field names selected by the client
- {info} - the GraphQLResolveInfo of the resolver

Available interpolations:
- {format|date} - returns the current date with a specific format

#### Defined in

[packages/types/src/config.ts:1116](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1116)

___

### field

• **field**: `string`

The type and field to apply cache to, you can use wild cards as well, for example: `Query.*`

#### Defined in

[packages/types/src/config.ts:1100](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1100)

___

### invalidate

• `Optional` **invalidate**: [`CacheInvalidateConfig`](types_src.YamlConfig.CacheInvalidateConfig)

#### Defined in

[packages/types/src/config.ts:1117](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1117)
