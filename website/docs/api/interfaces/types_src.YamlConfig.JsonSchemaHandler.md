---
title: 'JsonSchemaHandler'
---

# Interface: JsonSchemaHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).JsonSchemaHandler

Handler for JSON Schema specification. Source could be a local json file, or a url to it.

## Table of contents

### Properties

- [baseUrl](types_src.YamlConfig.JsonSchemaHandler#baseurl)
- [errorMessage](types_src.YamlConfig.JsonSchemaHandler#errormessage)
- [operationHeaders](types_src.YamlConfig.JsonSchemaHandler#operationheaders)
- [operations](types_src.YamlConfig.JsonSchemaHandler#operations)
- [schemaHeaders](types_src.YamlConfig.JsonSchemaHandler#schemaheaders)

## Properties

### baseUrl

• `Optional` **baseUrl**: `string`

#### Defined in

[packages/types/src/config.ts:334](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L334)

___

### errorMessage

• `Optional` **errorMessage**: `string`

Field name of your custom error object (default: 'message')

#### Defined in

[packages/types/src/config.ts:348](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L348)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:335](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L335)

___

### operations

• **operations**: ([`JsonSchemaHTTPOperation`](types_src.YamlConfig.JsonSchemaHTTPOperation) \| [`JsonSchemaPubSubOperation`](types_src.YamlConfig.JsonSchemaPubSubOperation))[]

Any of: JsonSchemaHTTPOperation, JsonSchemaPubSubOperation

#### Defined in

[packages/types/src/config.ts:344](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L344)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:338](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L338)
