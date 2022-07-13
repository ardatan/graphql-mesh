---
title: 'GraphQLHandlerHTTPConfiguration'
---

# Interface: GraphQLHandlerHTTPConfiguration

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).GraphQLHandlerHTTPConfiguration

## Table of contents

### Properties

- [batch](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#batch)
- [credentials](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#credentials)
- [endpoint](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#endpoint)
- [introspection](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#introspection)
- [method](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#method)
- [multipart](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#multipart)
- [operationHeaders](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#operationheaders)
- [retry](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#retry)
- [schemaHeaders](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#schemaheaders)
- [subscriptionsProtocol](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#subscriptionsprotocol)
- [timeout](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#timeout)
- [useGETForQueries](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#usegetforqueries)
- [webSocketImpl](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#websocketimpl)

## Properties

### batch

• `Optional` **batch**: `boolean`

Enable/Disable automatic query batching

#### Defined in

[packages/types/src/config.ts:294](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L294)

___

### credentials

• `Optional` **credentials**: ``"omit"`` \| ``"include"`` \| ``"disable"``

Request Credentials if your environment supports it.
[See more](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials)

Some environments like CF Workers don't even want to have this set.
So if you have problems like that. Just pass `disable` here. (Allowed values: omit, include, disable)

#### Defined in

[packages/types/src/config.ts:263](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L263)

___

### endpoint

• **endpoint**: `string`

A url or file path to your remote GraphQL endpoint.
If you provide a path to a code file(js or ts),
other options will be ignored and the schema exported from the file will be used directly.

#### Defined in

[packages/types/src/config.ts:237](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L237)

___

### introspection

• `Optional` **introspection**: `string`

Path to the introspection
You can separately give schema introspection

#### Defined in

[packages/types/src/config.ts:272](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L272)

___

### method

• `Optional` **method**: ``"GET"`` \| ``"POST"``

HTTP method used for GraphQL operations (Allowed values: GET, POST)

#### Defined in

[packages/types/src/config.ts:255](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L255)

___

### multipart

• `Optional` **multipart**: `boolean`

Enable multipart/formdata in order to support file uploads

#### Defined in

[packages/types/src/config.ts:276](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L276)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

JSON object representing the Headers to add to the runtime of the API calls only for operation during runtime

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:245](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L245)

___

### retry

• `Optional` **retry**: `number`

Retry attempts if fails

#### Defined in

[packages/types/src/config.ts:286](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L286)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `any`

JSON object representing the Headers to add to the runtime of the API calls only for schema introspection

#### Defined in

[packages/types/src/config.ts:241](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L241)

___

### subscriptionsProtocol

• `Optional` **subscriptionsProtocol**: ``"SSE"`` \| ``"WS"`` \| ``"LEGACY_WS"``

SSE - Server Sent Events
WS - New graphql-ws
LEGACY_WS - Legacy subscriptions-transport-ws (Allowed values: SSE, WS, LEGACY_WS)

#### Defined in

[packages/types/src/config.ts:282](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L282)

___

### timeout

• `Optional` **timeout**: `number`

Timeout in milliseconds

#### Defined in

[packages/types/src/config.ts:290](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L290)

___

### useGETForQueries

• `Optional` **useGETForQueries**: `boolean`

Use HTTP GET for Query operations

#### Defined in

[packages/types/src/config.ts:251](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L251)

___

### webSocketImpl

• `Optional` **webSocketImpl**: `string`

Path to a custom W3 Compatible WebSocket Implementation

#### Defined in

[packages/types/src/config.ts:267](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L267)
