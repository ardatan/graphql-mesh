---
title: 'GraphQLHandler'
---

# Interface: GraphQLHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).GraphQLHandler

Handler for remote/local/third-party GraphQL schema

## Table of contents

### Properties

- [batch](types_src.YamlConfig.GraphQLHandler#batch)
- [customFetch](types_src.YamlConfig.GraphQLHandler#customfetch)
- [endpoint](types_src.YamlConfig.GraphQLHandler#endpoint)
- [introspection](types_src.YamlConfig.GraphQLHandler#introspection)
- [method](types_src.YamlConfig.GraphQLHandler#method)
- [multipart](types_src.YamlConfig.GraphQLHandler#multipart)
- [operationHeaders](types_src.YamlConfig.GraphQLHandler#operationheaders)
- [schemaHeaders](types_src.YamlConfig.GraphQLHandler#schemaheaders)
- [subscriptionsProtocol](types_src.YamlConfig.GraphQLHandler#subscriptionsprotocol)
- [useGETForQueries](types_src.YamlConfig.GraphQLHandler#usegetforqueries)
- [webSocketImpl](types_src.YamlConfig.GraphQLHandler#websocketimpl)

## Properties

### batch

• `Optional` **batch**: `boolean`

Batch requests

#### Defined in

[packages/types/src/config.ts:269](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L269)

___

### customFetch

• `Optional` **customFetch**: `any`

Path to a custom W3 Compatible Fetch Implementation

#### Defined in

[packages/types/src/config.ts:252](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L252)

___

### endpoint

• **endpoint**: `string`

A url or file path to your remote GraphQL endpoint.
If you provide a path to a code file(js or ts),
other options will be ignored and the schema exported from the file will be used directly.

#### Defined in

[packages/types/src/config.ts:229](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L229)

___

### introspection

• `Optional` **introspection**: `string`

Path to the introspection
You can seperately give schema introspection

#### Defined in

[packages/types/src/config.ts:261](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L261)

___

### method

• `Optional` **method**: ``"GET"`` \| ``"POST"``

HTTP method used for GraphQL operations (Allowed values: GET, POST)

#### Defined in

[packages/types/src/config.ts:248](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L248)

___

### multipart

• `Optional` **multipart**: `boolean`

Enable multipart/formdata in order to support file uploads

#### Defined in

[packages/types/src/config.ts:265](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L265)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

JSON object representing the Headers to add to the runtime of the API calls only for operation during runtime

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:238](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L238)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `any`

JSON object representing the Headers to add to the runtime of the API calls only for schema introspection
You can also provide `.js` or `.ts` file path that exports schemaHeaders as an object

#### Defined in

[packages/types/src/config.ts:234](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L234)

___

### subscriptionsProtocol

• `Optional` **subscriptionsProtocol**: ``"SSE"`` \| ``"WS"`` \| ``"LEGACY_WS"``

SSE - Server Sent Events
WS - New graphql-ws
LEGACY_WS - Legacy subscriptions-transport-ws (Allowed values: SSE, WS, LEGACY_WS)

#### Defined in

[packages/types/src/config.ts:275](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L275)

___

### useGETForQueries

• `Optional` **useGETForQueries**: `boolean`

Use HTTP GET for Query operations

#### Defined in

[packages/types/src/config.ts:244](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L244)

___

### webSocketImpl

• `Optional` **webSocketImpl**: `string`

Path to a custom W3 Compatible WebSocket Implementation

#### Defined in

[packages/types/src/config.ts:256](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L256)
