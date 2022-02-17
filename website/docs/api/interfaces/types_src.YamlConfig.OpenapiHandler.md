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

[packages/types/src/config.ts:741](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L741)

___

### baseUrl

• `Optional` **baseUrl**: `string`

Specifies the URL on which all paths will be based on.
Overrides the server object in the OAS.

#### Defined in

[packages/types/src/config.ts:723](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L723)

___

### customFetch

• `Optional` **customFetch**: `any`

W3 Compatible Fetch Implementation

#### Defined in

[packages/types/src/config.ts:733](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L733)

___

### genericPayloadArgName

• `Optional` **genericPayloadArgName**: `boolean`

Set argument name for mutation payload to 'requestBody'. If false, name defaults to camelCased pathname

#### Defined in

[packages/types/src/config.ts:745](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L745)

___

### includeHttpDetails

• `Optional` **includeHttpDetails**: `boolean`

Include HTTP Response details to the result object

#### Defined in

[packages/types/src/config.ts:737](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L737)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

JSON object representing the Headers to add to the runtime of the API calls

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:710](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L710)

___

### provideErrorExtensions

• `Optional` **provideErrorExtensions**: `boolean`

Overwrite automatic wrapping of errors into GraphqlErrors

#### Defined in

[packages/types/src/config.ts:753](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L753)

___

### qs

• `Optional` **qs**: `Object`

JSON object representing the query search parameters to add to the API calls

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:727](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L727)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

If you are using a remote URL endpoint to fetch your schema, you can set headers for the HTTP request to fetch your schema.

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:716](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L716)

___

### selectQueryOrMutationField

• `Optional` **selectQueryOrMutationField**: [`SelectQueryOrMutationFieldConfig`](types_src.YamlConfig.SelectQueryOrMutationFieldConfig)[]

Allows to explicitly override the default operation (Query or Mutation) for any OAS operation

#### Defined in

[packages/types/src/config.ts:749](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L749)

___

### source

• **source**: `any`

A pointer to your API source - could be a local file, remote file or url endpoint

#### Defined in

[packages/types/src/config.ts:702](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L702)

___

### sourceFormat

• `Optional` **sourceFormat**: ``"json"`` \| ``"yaml"``

Format of the source file (Allowed values: json, yaml)

#### Defined in

[packages/types/src/config.ts:706](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L706)
