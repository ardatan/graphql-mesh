---
title: 'NewOpenapiHandler'
---

# Interface: NewOpenapiHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).NewOpenapiHandler

Handler for Swagger / OpenAPI 2/3 specification. Source could be a local json/swagger file, or a url to it.

## Table of contents

### Properties

- [baseUrl](types_src.YamlConfig.NewOpenapiHandler#baseurl)
- [fallbackFormat](types_src.YamlConfig.NewOpenapiHandler#fallbackformat)
- [ignoreErrorResponses](types_src.YamlConfig.NewOpenapiHandler#ignoreerrorresponses)
- [oasFilePath](types_src.YamlConfig.NewOpenapiHandler#oasfilepath)
- [operationHeaders](types_src.YamlConfig.NewOpenapiHandler#operationheaders)
- [schemaHeaders](types_src.YamlConfig.NewOpenapiHandler#schemaheaders)
- [selectQueryOrMutationField](types_src.YamlConfig.NewOpenapiHandler#selectqueryormutationfield)

## Properties

### baseUrl

• `Optional` **baseUrl**: `string`

#### Defined in

[packages/types/src/config.ts:700](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L700)

___

### fallbackFormat

• `Optional` **fallbackFormat**: ``"json"`` \| ``"yaml"`` \| ``"js"`` \| ``"ts"``

Allowed values: json, yaml, js, ts

#### Defined in

[packages/types/src/config.ts:699](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L699)

___

### ignoreErrorResponses

• `Optional` **ignoreErrorResponses**: `boolean`

#### Defined in

[packages/types/src/config.ts:707](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L707)

___

### oasFilePath

• **oasFilePath**: `string`

#### Defined in

[packages/types/src/config.ts:695](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L695)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:704](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L704)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:701](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L701)

___

### selectQueryOrMutationField

• `Optional` **selectQueryOrMutationField**: [`OASSelectQueryOrMutationFieldConfig`](types_src.YamlConfig.OASSelectQueryOrMutationFieldConfig)[]

#### Defined in

[packages/types/src/config.ts:708](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L708)
