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

[packages/types/src/config.ts:926](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L926)

___

### https

• `Optional` **https**: `boolean`

Boolean value indicating whether to use https. Defaults to false.

#### Defined in

[packages/types/src/config.ts:938](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L938)

___

### idl

• **idl**: `string`

Path to IDL file

#### Defined in

[packages/types/src/config.ts:962](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L962)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

JSON object representing the Headers to add to the runtime of the API calls

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:950](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L950)

___

### path

• `Optional` **path**: `string`

The path on which the Thrift service is listening. Defaults to '/thrift'.

#### Defined in

[packages/types/src/config.ts:934](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L934)

___

### port

• **port**: `number`

The port number to attach to on the host.

#### Defined in

[packages/types/src/config.ts:930](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L930)

___

### protocol

• `Optional` **protocol**: ``"json"`` \| ``"binary"`` \| ``"compact"``

Name of the Thrift protocol type to use. Defaults to 'binary'. (Allowed values: binary, compact, json)

#### Defined in

[packages/types/src/config.ts:942](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L942)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

If you are using a remote URL endpoint to fetch your schema, you can set headers for the HTTP request to fetch your schema.

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:956](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L956)

___

### serviceName

• **serviceName**: `string`

The name of your service. Used for logging.

#### Defined in

[packages/types/src/config.ts:946](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L946)
