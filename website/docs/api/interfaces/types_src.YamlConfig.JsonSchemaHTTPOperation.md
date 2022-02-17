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

[packages/types/src/config.ts:363](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L363)

___

### binary

• `Optional` **binary**: `boolean`

If true, this operation cannot have requestSchema or requestSample
And the request body will be passed as binary with its mime type
unless you define an explicit Content-Type header

#### Defined in

[packages/types/src/config.ts:379](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L379)

___

### description

• `Optional` **description**: `string`

#### Defined in

[packages/types/src/config.ts:352](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L352)

___

### field

• **field**: `string`

#### Defined in

[packages/types/src/config.ts:351](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L351)

___

### headers

• `Optional` **headers**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:371](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L371)

___

### method

• `Optional` **method**: ``"GET"`` \| ``"POST"`` \| ``"DELETE"`` \| ``"PATCH"`` \| ``"HEAD"`` \| ``"PUT"`` \| ``"CONNECT"`` \| ``"OPTIONS"`` \| ``"TRACE"``

Allowed values: GET, HEAD, POST, PUT, DELETE, CONNECT, OPTIONS, TRACE, PATCH

#### Defined in

[packages/types/src/config.ts:370](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L370)

___

### path

• **path**: `string`

#### Defined in

[packages/types/src/config.ts:366](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L366)

___

### requestSample

• `Optional` **requestSample**: `any`

#### Defined in

[packages/types/src/config.ts:358](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L358)

___

### requestSchema

• `Optional` **requestSchema**: `any`

#### Defined in

[packages/types/src/config.ts:357](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L357)

___

### requestTypeName

• `Optional` **requestTypeName**: `string`

#### Defined in

[packages/types/src/config.ts:359](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L359)

___

### responseSample

• `Optional` **responseSample**: `any`

#### Defined in

[packages/types/src/config.ts:361](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L361)

___

### responseSchema

• `Optional` **responseSchema**: `any`

#### Defined in

[packages/types/src/config.ts:360](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L360)

___

### responseTypeName

• `Optional` **responseTypeName**: `string`

#### Defined in

[packages/types/src/config.ts:362](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L362)

___

### type

• **type**: ``"Query"`` \| ``"Mutation"`` \| ``"Subscription"``

Allowed values: Query, Mutation, Subscription

#### Defined in

[packages/types/src/config.ts:356](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L356)
