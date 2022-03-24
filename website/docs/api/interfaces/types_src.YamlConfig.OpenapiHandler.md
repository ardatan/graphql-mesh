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
- [customFetch](types_src.YamlConfig.OpenapiHandler#customfetch)
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

[packages/types/src/config.ts:796](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L796)

___

### baseUrl

• `Optional` **baseUrl**: `string`

Specifies the URL on which all paths will be based on.
Overrides the server object in the OAS.

#### Defined in

[packages/types/src/config.ts:778](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L778)

___

### customFetch

• `Optional` **customFetch**: `any`

W3 Compatible Fetch Implementation

#### Defined in

[packages/types/src/config.ts:788](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L788)

___

### genericPayloadArgName

• `Optional` **genericPayloadArgName**: `boolean`

Set argument name for mutation payload to 'requestBody'. If false, name defaults to camelCased pathname

#### Defined in

[packages/types/src/config.ts:800](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L800)

___

### includeHttpDetails

• `Optional` **includeHttpDetails**: `boolean`

Include HTTP Response details to the result object

#### Defined in

[packages/types/src/config.ts:792](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L792)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

JSON object representing the Headers to add to the runtime of the API calls

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:765](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L765)

___

### operationIdFieldNames

• `Optional` **operationIdFieldNames**: `boolean`

Field names can only be sanitized operationIds

By default, query field names are based on the return type type name and mutation field names are based on the operationId, which may be generated if it does not exist.

This option forces OpenAPI handler to only create field names based on the operationId.

#### Defined in

[packages/types/src/config.ts:816](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L816)

___

### provideErrorExtensions

• `Optional` **provideErrorExtensions**: `boolean`

Overwrite automatic wrapping of errors into GraphqlErrors

#### Defined in

[packages/types/src/config.ts:808](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L808)

___

### qs

• `Optional` **qs**: `Object`

JSON object representing the query search parameters to add to the API calls

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:782](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L782)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

If you are using a remote URL endpoint to fetch your schema, you can set headers for the HTTP request to fetch your schema.

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:771](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L771)

___

### selectQueryOrMutationField

• `Optional` **selectQueryOrMutationField**: [`SelectQueryOrMutationFieldConfig`](types_src.YamlConfig.SelectQueryOrMutationFieldConfig)[]

Allows to explicitly override the default operation (Query or Mutation) for any OAS operation

#### Defined in

[packages/types/src/config.ts:804](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L804)

___

### source

• **source**: `any`

A pointer to your API source - could be a local file, remote file or url endpoint

#### Defined in

[packages/types/src/config.ts:757](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L757)

___

### sourceFormat

• `Optional` **sourceFormat**: ``"json"`` \| ``"yaml"``

Format of the source file (Allowed values: json, yaml)

#### Defined in

[packages/types/src/config.ts:761](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L761)
