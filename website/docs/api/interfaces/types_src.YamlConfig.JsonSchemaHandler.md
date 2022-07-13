---
title: 'JsonSchemaHandler'
---

# Interface: JsonSchemaHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).JsonSchemaHandler

## Table of contents

### Properties

- [baseUrl](types_src.YamlConfig.JsonSchemaHandler#baseurl)
- [ignoreErrorResponses](types_src.YamlConfig.JsonSchemaHandler#ignoreerrorresponses)
- [noDeduplication](types_src.YamlConfig.JsonSchemaHandler#nodeduplication)
- [operationHeaders](types_src.YamlConfig.JsonSchemaHandler#operationheaders)
- [operations](types_src.YamlConfig.JsonSchemaHandler#operations)
- [queryParams](types_src.YamlConfig.JsonSchemaHandler#queryparams)
- [schemaHeaders](types_src.YamlConfig.JsonSchemaHandler#schemaheaders)

## Properties

### baseUrl

• `Optional` **baseUrl**: `string`

#### Defined in

[packages/types/src/config.ts:380](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L380)

___

### ignoreErrorResponses

• `Optional` **ignoreErrorResponses**: `boolean`

#### Defined in

[packages/types/src/config.ts:391](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L391)

___

### noDeduplication

• `Optional` **noDeduplication**: `boolean`

By default, the handler will try to deduplicate the similar types to reduce the complexity of the final schema.
You can disable this behavior by setting this to true.

#### Defined in

[packages/types/src/config.ts:397](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L397)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:381](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L381)

___

### operations

• **operations**: ([`JsonSchemaHTTPOperation`](types_src.YamlConfig.JsonSchemaHTTPOperation) \| [`JsonSchemaPubSubOperation`](types_src.YamlConfig.JsonSchemaPubSubOperation))[]

Any of: JsonSchemaHTTPOperation, JsonSchemaPubSubOperation

#### Defined in

[packages/types/src/config.ts:390](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L390)

___

### queryParams

• `Optional` **queryParams**: `any`

#### Defined in

[packages/types/src/config.ts:392](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L392)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:384](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L384)
