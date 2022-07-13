---
title: 'ResponseCacheConfig'
---

# Interface: ResponseCacheConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).ResponseCacheConfig

## Table of contents

### Properties

- [cacheKey](types_src.YamlConfig.ResponseCacheConfig#cachekey)
- [idFields](types_src.YamlConfig.ResponseCacheConfig#idfields)
- [if](types_src.YamlConfig.ResponseCacheConfig#if)
- [ignoredTypes](types_src.YamlConfig.ResponseCacheConfig#ignoredtypes)
- [includeExtensionMetadata](types_src.YamlConfig.ResponseCacheConfig#includeextensionmetadata)
- [invalidateViaMutation](types_src.YamlConfig.ResponseCacheConfig#invalidateviamutation)
- [sessionId](types_src.YamlConfig.ResponseCacheConfig#sessionid)
- [shouldCacheResult](types_src.YamlConfig.ResponseCacheConfig#shouldcacheresult)
- [ttl](types_src.YamlConfig.ResponseCacheConfig#ttl)
- [ttlPerCoordinate](types_src.YamlConfig.ResponseCacheConfig#ttlpercoordinate)

## Properties

### cacheKey

• `Optional` **cacheKey**: `string`

Customize the behavior how the response cache key is computed from the documentString, variableValues, contextValue and sessionId.
If the given string is interpolated as empty, default behavior is used.
Example;
```yml
# Cache by specific value
cacheKey: "{variableValues.userId}"

# Cache by documentString
cacheKey: "{documentString}"

# Cache by operationName
cacheKey: "{operationName}"

# Cache by some header value
cacheKey: "{contextValue.headers.authorization}"

# Or combine two of each
cacheKey: "{contextValue.headers.authorization}-{operationName}"
```

#### Defined in

[packages/types/src/config.ts:1943](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1943)

___

### idFields

• `Optional` **idFields**: `string`[]

List of fields that are used to identify the entity.

#### Defined in

[packages/types/src/config.ts:1895](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1895)

___

### if

• `Optional` **if**: `string`

Specify whether the cache should be used based on the context.
```yml
if: "context.headers.userId != null"
```

#### Defined in

[packages/types/src/config.ts:1921](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1921)

___

### ignoredTypes

• `Optional` **ignoredTypes**: `string`[]

Skip caching of following the types.

#### Defined in

[packages/types/src/config.ts:1891](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1891)

___

### includeExtensionMetadata

• `Optional` **includeExtensionMetadata**: `boolean`

Include extension values that provide useful information, such as whether the cache was hit or which resources a mutation invalidated.

#### Defined in

[packages/types/src/config.ts:1904](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1904)

___

### invalidateViaMutation

• `Optional` **invalidateViaMutation**: `boolean`

Whether the mutation execution result should be used for invalidating resources.
Defaults to `true`

#### Defined in

[packages/types/src/config.ts:1900](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1900)

___

### sessionId

• `Optional` **sessionId**: `string`

Allows to cache responses based on the resolved session id.
Return a unique value for each session.
Creates a global session by default.
Example;
```yml
sessionId: "{context.headers.userId}"
```

#### Defined in

[packages/types/src/config.ts:1914](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1914)

___

### shouldCacheResult

• `Optional` **shouldCacheResult**: `string`

Checks if the result should be cached.
```yml
shouldCacheResult: "result.errors.length > 0"
```

#### Defined in

[packages/types/src/config.ts:1950](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1950)

___

### ttl

• `Optional` **ttl**: `number`

Maximum age in ms. Defaults to `Infinity`. Set it to 0 for disabling the global TTL.

#### Defined in

[packages/types/src/config.ts:1882](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1882)

___

### ttlPerCoordinate

• `Optional` **ttlPerCoordinate**: [`ResponseCacheTTLConfig`](types_src.YamlConfig.ResponseCacheTTLConfig)[]

Overwrite the ttl for query operations whose selection contains a specific schema coordinate (e.g. Query.users).
Useful if the selection of a specific field should reduce the TTL of the query operation.

#### Defined in

[packages/types/src/config.ts:1887](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1887)
