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

[packages/types/src/config.ts:806](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L806)

___

### fallbackFormat

• `Optional` **fallbackFormat**: ``"json"`` \| ``"yaml"`` \| ``"js"`` \| ``"ts"``

Allowed values: json, yaml, js, ts

#### Defined in

[packages/types/src/config.ts:805](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L805)

___

### ignoreErrorResponses

• `Optional` **ignoreErrorResponses**: `boolean`

#### Defined in

[packages/types/src/config.ts:813](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L813)

___

### oasFilePath

• **oasFilePath**: `string`

#### Defined in

[packages/types/src/config.ts:801](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L801)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:810](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L810)

___

### queryParams

• `Optional` **queryParams**: `any`

#### Defined in

[packages/types/src/config.ts:815](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L815)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:807](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L807)

___

### selectQueryOrMutationField

• `Optional` **selectQueryOrMutationField**: [`OASSelectQueryOrMutationFieldConfig`](types_src.YamlConfig.OASSelectQueryOrMutationFieldConfig)[]

#### Defined in

[packages/types/src/config.ts:814](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L814)
