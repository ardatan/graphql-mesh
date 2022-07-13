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
- [queryParams](types_src.YamlConfig.NewOpenapiHandler#queryparams)
- [schemaHeaders](types_src.YamlConfig.NewOpenapiHandler#schemaheaders)
- [selectQueryOrMutationField](types_src.YamlConfig.NewOpenapiHandler#selectqueryormutationfield)

## Properties

### baseUrl

• `Optional` **baseUrl**: `string`

#### Defined in

[packages/types/src/config.ts:804](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L804)

___

### fallbackFormat

• `Optional` **fallbackFormat**: ``"json"`` \| ``"yaml"`` \| ``"js"`` \| ``"ts"``

Allowed values: json, yaml, js, ts

#### Defined in

[packages/types/src/config.ts:803](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L803)

___

### ignoreErrorResponses

• `Optional` **ignoreErrorResponses**: `boolean`

#### Defined in

[packages/types/src/config.ts:811](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L811)

___

### oasFilePath

• **oasFilePath**: `string`

#### Defined in

[packages/types/src/config.ts:799](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L799)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:808](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L808)

___

### queryParams

• `Optional` **queryParams**: `any`

#### Defined in

[packages/types/src/config.ts:813](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L813)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:805](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L805)

___

### selectQueryOrMutationField

• `Optional` **selectQueryOrMutationField**: [`OASSelectQueryOrMutationFieldConfig`](types_src.YamlConfig.OASSelectQueryOrMutationFieldConfig)[]

#### Defined in

[packages/types/src/config.ts:812](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L812)
