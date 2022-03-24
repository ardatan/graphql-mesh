---
title: 'ServeConfig'
---

# Interface: ServeConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).ServeConfig

Configuration for `mesh start` or `mesh dev` command.
Those commands won't be available in programmatic usage.

## Table of contents

### Properties

- [browser](types_src.YamlConfig.ServeConfig#browser)
- [cors](types_src.YamlConfig.ServeConfig#cors)
- [customServerHandler](types_src.YamlConfig.ServeConfig#customserverhandler)
- [endpoint](types_src.YamlConfig.ServeConfig#endpoint)
- [fork](types_src.YamlConfig.ServeConfig#fork)
- [handlers](types_src.YamlConfig.ServeConfig#handlers)
- [hostname](types_src.YamlConfig.ServeConfig#hostname)
- [maxRequestBodySize](types_src.YamlConfig.ServeConfig#maxrequestbodysize)
- [playground](types_src.YamlConfig.ServeConfig#playground)
- [playgroundTitle](types_src.YamlConfig.ServeConfig#playgroundtitle)
- [port](types_src.YamlConfig.ServeConfig#port)
- [sslCredentials](types_src.YamlConfig.ServeConfig#sslcredentials)
- [staticFiles](types_src.YamlConfig.ServeConfig#staticfiles)

## Properties

### browser

• `Optional` **browser**: `string` | `boolean`

Path to the browser that will be used by `mesh serve` to open a playground window in development mode
This feature can be disable by passing `false` (Any of: String, Boolean)

#### Defined in

[packages/types/src/config.ts:112](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L112)

___

### cors

• `Optional` **cors**: [`CorsConfig`](types_src.YamlConfig.CorsConfig)

#### Defined in

[packages/types/src/config.ts:86](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L86)

___

### customServerHandler

• `Optional` **customServerHandler**: `string`

If you want to use a custom GraphQL server, you can pass the path of the code file that exports a custom Mesh Server Handler
With a custom server handler, you won't be able to use the features of GraphQL Mesh HTTP Server

#### Defined in

[packages/types/src/config.ts:117](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L117)

___

### endpoint

• `Optional` **endpoint**: `string`

Path to GraphQL Endpoint (default: /graphql)

#### Defined in

[packages/types/src/config.ts:107](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L107)

___

### fork

• `Optional` **fork**: `number` | `boolean`

Spawn multiple server instances as node clusters (default: `1`) (Any of: Int, Boolean)

#### Defined in

[packages/types/src/config.ts:77](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L77)

___

### handlers

• `Optional` **handlers**: ([`WebhookHandler`](types_src.YamlConfig.WebhookHandler) | [`ExpressHandler`](types_src.YamlConfig.ExpressHandler))[]

Express/Connect compatible handlers and middlewares extend GraphQL Mesh HTTP Server (Any of: WebhookHandler, ExpressHandler)

#### Defined in

[packages/types/src/config.ts:90](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L90)

___

### hostname

• `Optional` **hostname**: `string`

The binding hostname (default: `localhost`)

#### Defined in

[packages/types/src/config.ts:85](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L85)

___

### maxRequestBodySize

• `Optional` **maxRequestBodySize**: `string` | `number`

Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing. Defaults to '100kb'. (Any of: Int, String)

#### Defined in

[packages/types/src/config.ts:102](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L102)

___

### playground

• `Optional` **playground**: `boolean`

Show GraphiQL Playground

#### Defined in

[packages/types/src/config.ts:98](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L98)

___

### playgroundTitle

• `Optional` **playgroundTitle**: `string`

Title of GraphiQL Playground

#### Defined in

[packages/types/src/config.ts:121](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L121)

___

### port

• `Optional` **port**: `string` | `number`

TCP Port to listen (default: `3000`) (Any of: Int, String)

#### Defined in

[packages/types/src/config.ts:81](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L81)

___

### sslCredentials

• `Optional` **sslCredentials**: [`HTTPSConfig`](types_src.YamlConfig.HTTPSConfig)

#### Defined in

[packages/types/src/config.ts:103](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L103)

___

### staticFiles

• `Optional` **staticFiles**: `string`

Path to your static files you want to be served with GraphQL Mesh HTTP Server

#### Defined in

[packages/types/src/config.ts:94](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L94)
