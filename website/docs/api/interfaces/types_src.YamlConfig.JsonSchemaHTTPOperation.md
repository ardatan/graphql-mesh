---
title: 'JsonSchemaHTTPOperation'
---

# Interface: JsonSchemaHTTPOperation

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).JsonSchemaHTTPOperation

## Table of contents

### Properties

- [argTypeMap](types_src.YamlConfig.JsonSchemaHTTPOperation#argtypemap)
- [binary](types_src.YamlConfig.JsonSchemaHTTPOperation#binary)
- [description](types_src.YamlConfig.JsonSchemaHTTPOperation#description)
- [field](types_src.YamlConfig.JsonSchemaHTTPOperation#field)
- [headers](types_src.YamlConfig.JsonSchemaHTTPOperation#headers)
- [method](types_src.YamlConfig.JsonSchemaHTTPOperation#method)
- [path](types_src.YamlConfig.JsonSchemaHTTPOperation#path)
- [requestBaseBody](types_src.YamlConfig.JsonSchemaHTTPOperation#requestbasebody)
- [requestSample](types_src.YamlConfig.JsonSchemaHTTPOperation#requestsample)
- [requestSchema](types_src.YamlConfig.JsonSchemaHTTPOperation#requestschema)
- [requestTypeName](types_src.YamlConfig.JsonSchemaHTTPOperation#requesttypename)
- [responseSample](types_src.YamlConfig.JsonSchemaHTTPOperation#responsesample)
- [responseSchema](types_src.YamlConfig.JsonSchemaHTTPOperation#responseschema)
- [responseTypeName](types_src.YamlConfig.JsonSchemaHTTPOperation#responsetypename)
- [type](types_src.YamlConfig.JsonSchemaHTTPOperation#type)

## Properties

### argTypeMap

• `Optional` **argTypeMap**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:392](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L392)

___

### binary

• `Optional` **binary**: `boolean`

If true, this operation cannot have requestSchema or requestSample
And the request body will be passed as binary with its mime type
unless you define an explicit Content-Type header

#### Defined in

[packages/types/src/config.ts:408](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L408)

___

### description

• `Optional` **description**: `string`

#### Defined in

[packages/types/src/config.ts:377](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L377)

___

### field

• **field**: `string`

#### Defined in

[packages/types/src/config.ts:376](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L376)

___

### headers

• `Optional` **headers**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:400](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L400)

___

### method

• `Optional` **method**: ``"GET"`` \| ``"POST"`` \| ``"DELETE"`` \| ``"PATCH"`` \| ``"HEAD"`` \| ``"PUT"`` \| ``"CONNECT"`` \| ``"OPTIONS"`` \| ``"TRACE"``

Allowed values: GET, HEAD, POST, PUT, DELETE, CONNECT, OPTIONS, TRACE, PATCH

#### Defined in

[packages/types/src/config.ts:399](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L399)

___

### path

• **path**: `string`

#### Defined in

[packages/types/src/config.ts:395](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L395)

___

### requestBaseBody

• `Optional` **requestBaseBody**: `any`

This body will be merged with the request body sent with the underlying HTTP request

#### Defined in

[packages/types/src/config.ts:388](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L388)

___

### requestSample

• `Optional` **requestSample**: `any`

#### Defined in

[packages/types/src/config.ts:383](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L383)

___

### requestSchema

• `Optional` **requestSchema**: `any`

#### Defined in

[packages/types/src/config.ts:382](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L382)

___

### requestTypeName

• `Optional` **requestTypeName**: `string`

#### Defined in

[packages/types/src/config.ts:384](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L384)

___

### responseSample

• `Optional` **responseSample**: `any`

#### Defined in

[packages/types/src/config.ts:390](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L390)

___

### responseSchema

• `Optional` **responseSchema**: `any`

#### Defined in

[packages/types/src/config.ts:389](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L389)

___

### responseTypeName

• `Optional` **responseTypeName**: `string`

#### Defined in

[packages/types/src/config.ts:391](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L391)

___

### type

• **type**: ``"Query"`` \| ``"Mutation"`` \| ``"Subscription"``

Allowed values: Query, Mutation, Subscription

#### Defined in

[packages/types/src/config.ts:381](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L381)
