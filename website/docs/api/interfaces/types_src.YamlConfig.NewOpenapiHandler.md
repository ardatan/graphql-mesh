---
title: 'NewOpenapiHandler'
---

# Interface: NewOpenapiHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).NewOpenapiHandler

Handler for Swagger / OpenAPI 2/3 specification. Source could be a local json/swagger file, or a url to it.

## Table of contents

### Properties

- [baseUrl](types_src.YamlConfig.NewOpenapiHandler#baseurl)
- [ignoreErrorResponses](types_src.YamlConfig.NewOpenapiHandler#ignoreerrorresponses)
- [oasFilePath](types_src.YamlConfig.NewOpenapiHandler#oasfilepath)
- [operationHeaders](types_src.YamlConfig.NewOpenapiHandler#operationheaders)
- [schemaHeaders](types_src.YamlConfig.NewOpenapiHandler#schemaheaders)
- [selectQueryOrMutationField](types_src.YamlConfig.NewOpenapiHandler#selectqueryormutationfield)

## Properties

### baseUrl

• `Optional` **baseUrl**: `string`

#### Defined in

[packages/types/src/config.ts:696](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L696)

___

### ignoreErrorResponses

• `Optional` **ignoreErrorResponses**: `boolean`

#### Defined in

[packages/types/src/config.ts:703](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L703)

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

[packages/types/src/config.ts:700](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L700)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:697](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L697)

___

### selectQueryOrMutationField

• `Optional` **selectQueryOrMutationField**: [`OASSelectQueryOrMutationFieldConfig`](types_src.YamlConfig.OASSelectQueryOrMutationFieldConfig)[]

#### Defined in

[packages/types/src/config.ts:704](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L704)
