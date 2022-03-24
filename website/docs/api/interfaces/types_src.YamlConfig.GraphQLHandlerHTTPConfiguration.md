---
title: 'GraphQLHandlerHTTPConfiguration'
---

# Interface: GraphQLHandlerHTTPConfiguration

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).GraphQLHandlerHTTPConfiguration

## Table of contents

### Properties

- [batch](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#batch)
- [customFetch](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration#customfetch)
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

[packages/types/src/config.ts:285](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L285)

___

### customFetch

• `Optional` **customFetch**: `any`

Path to a custom W3 Compatible Fetch Implementation

#### Defined in

[packages/types/src/config.ts:254](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L254)

___

### endpoint

• **endpoint**: `string`

A url or file path to your remote GraphQL endpoint.
If you provide a path to a code file(js or ts),
other options will be ignored and the schema exported from the file will be used directly.

#### Defined in

[packages/types/src/config.ts:231](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L231)

___

### introspection

• `Optional` **introspection**: `string`

Path to the introspection
You can seperately give schema introspection

#### Defined in

[packages/types/src/config.ts:263](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L263)

___

### method

• `Optional` **method**: ``"GET"`` | ``"POST"``

HTTP method used for GraphQL operations (Allowed values: GET, POST)

#### Defined in

[packages/types/src/config.ts:250](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L250)

___

### multipart

• `Optional` **multipart**: `boolean`

Enable multipart/formdata in order to support file uploads

#### Defined in

[packages/types/src/config.ts:267](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L267)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

JSON object representing the Headers to add to the runtime of the API calls only for operation during runtime

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:240](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L240)

___

### retry

• `Optional` **retry**: `number`

Retry attempts if fails

#### Defined in

[packages/types/src/config.ts:277](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L277)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `any`

JSON object representing the Headers to add to the runtime of the API calls only for schema introspection
You can also provide `.js` or `.ts` file path that exports schemaHeaders as an object

#### Defined in

[packages/types/src/config.ts:236](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L236)

___

### subscriptionsProtocol

• `Optional` **subscriptionsProtocol**: ``"SSE"`` | ``"WS"`` | ``"LEGACY_WS"``

SSE - Server Sent Events
WS - New graphql-ws
LEGACY_WS - Legacy subscriptions-transport-ws (Allowed values: SSE, WS, LEGACY_WS)

#### Defined in

[packages/types/src/config.ts:273](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L273)

___

### timeout

• `Optional` **timeout**: `number`

Timeout in milliseconds

#### Defined in

[packages/types/src/config.ts:281](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L281)

___

### useGETForQueries

• `Optional` **useGETForQueries**: `boolean`

Use HTTP GET for Query operations

#### Defined in

[packages/types/src/config.ts:246](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L246)

___

### webSocketImpl

• `Optional` **webSocketImpl**: `string`

Path to a custom W3 Compatible WebSocket Implementation

#### Defined in

[packages/types/src/config.ts:258](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L258)
