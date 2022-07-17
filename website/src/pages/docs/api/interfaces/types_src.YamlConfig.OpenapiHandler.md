---
title: 'OpenapiHandler'
---

# Interface: OpenapiHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).OpenapiHandler

Handler for Swagger / OpenAPI 2/3 specification. Source could be a local json/swagger file, or a url to it.

## Table of contents

### Properties

- [addLimitArgument](types_src.YamlConfig.OpenapiHandler#addlimitargument)
- [baseUrl](types_src.YamlConfig.OpenapiHandler#baseurl)
- [genericPayloadArgName](types_src.YamlConfig.OpenapiHandler#genericpayloadargname)
- [includeHttpDetails](types_src.YamlConfig.OpenapiHandler#includehttpdetails)
- [operationHeaders](types_src.YamlConfig.OpenapiHandler#operationheaders)
- [operationIdFieldNames](types_src.YamlConfig.OpenapiHandler#operationidfieldnames)
- [provideErrorExtensions](types_src.YamlConfig.OpenapiHandler#provideerrorextensions)
- [qs](types_src.YamlConfig.OpenapiHandler#qs)
- [schemaHeaders](types_src.YamlConfig.OpenapiHandler#schemaheaders)
- [selectQueryOrMutationField](types_src.YamlConfig.OpenapiHandler#selectqueryormutationfield)
- [source](types_src.YamlConfig.OpenapiHandler#source)
- [sourceFormat](types_src.YamlConfig.OpenapiHandler#sourceformat)

## Properties

### addLimitArgument

• `Optional` **addLimitArgument**: `boolean`

Auto-generate a 'limit' argument for all fields that return lists of objects, including ones produced by links

#### Defined in

[packages/types/src/config.ts:899](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L899)

___

### baseUrl

• `Optional` **baseUrl**: `string`

Specifies the URL on which all paths will be based on.
Overrides the server object in the OAS.

#### Defined in

[packages/types/src/config.ts:885](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L885)

___

### genericPayloadArgName

• `Optional` **genericPayloadArgName**: `boolean`

Set argument name for mutation payload to 'requestBody'. If false, name defaults to camelCased pathname

#### Defined in

[packages/types/src/config.ts:903](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L903)

___

### includeHttpDetails

• `Optional` **includeHttpDetails**: `boolean`

Include HTTP Response details to the result object

#### Defined in

[packages/types/src/config.ts:895](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L895)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

JSON object representing the Headers to add to the runtime of the API calls

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:872](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L872)

___

### operationIdFieldNames

• `Optional` **operationIdFieldNames**: `boolean`

Field names can only be sanitized operationIds
By default, query field names are based on the return type type name and mutation field names are based on the operationId, which may be generated if it does not exist.
This option forces OpenAPI handler to only create field names based on the operationId.

#### Defined in

[packages/types/src/config.ts:917](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L917)

___

### provideErrorExtensions

• `Optional` **provideErrorExtensions**: `boolean`

Overwrite automatic wrapping of errors into GraphqlErrors

#### Defined in

[packages/types/src/config.ts:911](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L911)

___

### qs

• `Optional` **qs**: `Object`

JSON object representing the query search parameters to add to the API calls

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:889](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L889)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

If you are using a remote URL endpoint to fetch your schema, you can set headers for the HTTP request to fetch your schema.

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:878](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L878)

___

### selectQueryOrMutationField

• `Optional` **selectQueryOrMutationField**: [`SelectQueryOrMutationFieldConfig`](types_src.YamlConfig.SelectQueryOrMutationFieldConfig)[]

Allows to explicitly override the default operation (Query or Mutation) for any OAS operation

#### Defined in

[packages/types/src/config.ts:907](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L907)

___

### source

• **source**: `any`

A pointer to your API source - could be a local file, remote file or url endpoint

#### Defined in

[packages/types/src/config.ts:864](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L864)

___

### sourceFormat

• `Optional` **sourceFormat**: ``"json"`` \| ``"yaml"``

Format of the source file (Allowed values: json, yaml)

#### Defined in

[packages/types/src/config.ts:868](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L868)
