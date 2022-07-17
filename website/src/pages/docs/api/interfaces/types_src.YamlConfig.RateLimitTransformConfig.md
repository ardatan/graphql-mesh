---
title: 'RateLimitTransformConfig'
---

# Interface: RateLimitTransformConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).RateLimitTransformConfig

## Table of contents

### Properties

- [field](types_src.YamlConfig.RateLimitTransformConfig#field)
- [identifier](types_src.YamlConfig.RateLimitTransformConfig#identifier)
- [max](types_src.YamlConfig.RateLimitTransformConfig#max)
- [ttl](types_src.YamlConfig.RateLimitTransformConfig#ttl)
- [type](types_src.YamlConfig.RateLimitTransformConfig#type)

## Properties

### field

• **field**: `string`

The field of the type that the rate limit is applied to

#### Defined in

[packages/types/src/config.ts:1541](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1541)

___

### identifier

• **identifier**: `string`

The identifier expression that determines the identity of the request (e.g. `{context.req.socket.remoteAddress}`)

#### Defined in

[packages/types/src/config.ts:1553](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1553)

___

### max

• **max**: `number`

The maximum number of requests that can be made in a given time period

#### Defined in

[packages/types/src/config.ts:1545](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1545)

___

### ttl

• **ttl**: `number`

The time period in which the rate limit is applied

#### Defined in

[packages/types/src/config.ts:1549](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1549)

___

### type

• **type**: `string`

The type name that the following field belongs to

#### Defined in

[packages/types/src/config.ts:1537](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1537)
