---
title: 'JsonSchemaHandler'
---

# Interface: JsonSchemaHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).JsonSchemaHandler

Handler for JSON Schema specification. Source could be a local json file, or a url to it.

## Table of contents

### Properties

- [baseUrl](types_src.YamlConfig.JsonSchemaHandler#baseurl)
- [ignoreErrorResponses](types_src.YamlConfig.JsonSchemaHandler#ignoreerrorresponses)
- [operationHeaders](types_src.YamlConfig.JsonSchemaHandler#operationheaders)
- [operations](types_src.YamlConfig.JsonSchemaHandler#operations)
- [schemaHeaders](types_src.YamlConfig.JsonSchemaHandler#schemaheaders)

## Properties

### baseUrl

• `Optional` **baseUrl**: `string`

#### Defined in

[packages/types/src/config.ts:362](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L362)

___

### ignoreErrorResponses

• `Optional` **ignoreErrorResponses**: `boolean`

#### Defined in

[packages/types/src/config.ts:373](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L373)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:363](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L363)

___

### operations

• **operations**: ([`JsonSchemaHTTPOperation`](types_src.YamlConfig.JsonSchemaHTTPOperation) \| [`JsonSchemaPubSubOperation`](types_src.YamlConfig.JsonSchemaPubSubOperation))[]

Any of: JsonSchemaHTTPOperation, JsonSchemaPubSubOperation

#### Defined in

[packages/types/src/config.ts:372](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L372)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:366](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L366)
