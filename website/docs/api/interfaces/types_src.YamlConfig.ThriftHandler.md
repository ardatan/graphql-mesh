---
title: 'ThriftHandler'
---

# Interface: ThriftHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).ThriftHandler

Handler for OData

## Table of contents

### Properties

- [hostName](types_src.YamlConfig.ThriftHandler#hostname)
- [https](types_src.YamlConfig.ThriftHandler#https)
- [idl](types_src.YamlConfig.ThriftHandler#idl)
- [operationHeaders](types_src.YamlConfig.ThriftHandler#operationheaders)
- [path](types_src.YamlConfig.ThriftHandler#path)
- [port](types_src.YamlConfig.ThriftHandler#port)
- [protocol](types_src.YamlConfig.ThriftHandler#protocol)
- [schemaHeaders](types_src.YamlConfig.ThriftHandler#schemaheaders)
- [serviceName](types_src.YamlConfig.ThriftHandler#servicename)

## Properties

### hostName

• **hostName**: `string`

The name of the host to connect to.

#### Defined in

[packages/types/src/config.ts:1012](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1012)

___

### https

• `Optional` **https**: `boolean`

Boolean value indicating whether to use https. Defaults to false.

#### Defined in

[packages/types/src/config.ts:1024](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1024)

___

### idl

• **idl**: `string`

Path to IDL file

#### Defined in

[packages/types/src/config.ts:1048](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1048)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

JSON object representing the Headers to add to the runtime of the API calls

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:1036](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1036)

___

### path

• `Optional` **path**: `string`

The path on which the Thrift service is listening. Defaults to '/thrift'.

#### Defined in

[packages/types/src/config.ts:1020](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1020)

___

### port

• **port**: `number`

The port number to attach to on the host.

#### Defined in

[packages/types/src/config.ts:1016](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1016)

___

### protocol

• `Optional` **protocol**: ``"json"`` \| ``"binary"`` \| ``"compact"``

Name of the Thrift protocol type to use. Defaults to 'binary'. (Allowed values: binary, compact, json)

#### Defined in

[packages/types/src/config.ts:1028](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1028)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

If you are using a remote URL endpoint to fetch your schema, you can set headers for the HTTP request to fetch your schema.

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:1042](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1042)

___

### serviceName

• **serviceName**: `string`

The name of your service. Used for logging.

#### Defined in

[packages/types/src/config.ts:1032](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1032)
