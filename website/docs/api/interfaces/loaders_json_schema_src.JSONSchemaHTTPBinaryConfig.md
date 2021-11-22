---
title: 'JSONSchemaHTTPBinaryConfig'
---

# Interface: JSONSchemaHTTPBinaryConfig

[loaders/json-schema/src](../modules/loaders_json_schema_src).JSONSchemaHTTPBinaryConfig

## Hierarchy

- [`JSONSchemaHTTPBaseOperationConfig`](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig)

  ↳ **`JSONSchemaHTTPBinaryConfig`**

## Table of contents

### Properties

- [argTypeMap](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig#argtypemap)
- [binary](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig#binary)
- [description](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig#description)
- [field](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig#field)
- [headers](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig#headers)
- [method](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig#method)
- [path](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig#path)
- [requestTypeName](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig#requesttypename)
- [responseSample](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig#responsesample)
- [responseSchema](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig#responseschema)
- [responseTypeName](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig#responsetypename)
- [type](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig#type)

## Properties

### argTypeMap

• `Optional` **argTypeMap**: `Record`<`string`, `string`\>

#### Inherited from

[JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig).[argTypeMap](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#argtypemap)

#### Defined in

[packages/loaders/json-schema/src/types.ts:13](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L13)

___

### binary

• **binary**: ``true``

#### Defined in

[packages/loaders/json-schema/src/types.ts:43](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L43)

___

### description

• `Optional` **description**: `string`

#### Inherited from

[JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig).[description](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#description)

#### Defined in

[packages/loaders/json-schema/src/types.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L7)

___

### field

• **field**: `string`

#### Inherited from

[JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig).[field](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#field)

#### Defined in

[packages/loaders/json-schema/src/types.ts:6](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L6)

___

### headers

• `Optional` **headers**: `Record`<`string`, `string`\>

#### Inherited from

[JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig).[headers](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#headers)

#### Defined in

[packages/loaders/json-schema/src/types.ts:28](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L28)

___

### method

• `Optional` **method**: [`HTTPMethod`](../modules/loaders_json_schema_src#httpmethod)

#### Overrides

[JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig).[method](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#method)

#### Defined in

[packages/loaders/json-schema/src/types.ts:41](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L41)

___

### path

• **path**: `string`

#### Overrides

[JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig).[path](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#path)

#### Defined in

[packages/loaders/json-schema/src/types.ts:40](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L40)

___

### requestTypeName

• `Optional` **requestTypeName**: `string`

#### Defined in

[packages/loaders/json-schema/src/types.ts:42](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L42)

___

### responseSample

• `Optional` **responseSample**: `any`

#### Inherited from

[JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig).[responseSample](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#responsesample)

#### Defined in

[packages/loaders/json-schema/src/types.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L10)

___

### responseSchema

• `Optional` **responseSchema**: `string` \| [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Inherited from

[JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig).[responseSchema](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#responseschema)

#### Defined in

[packages/loaders/json-schema/src/types.ts:9](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L9)

___

### responseTypeName

• `Optional` **responseTypeName**: `string`

#### Inherited from

[JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig).[responseTypeName](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#responsetypename)

#### Defined in

[packages/loaders/json-schema/src/types.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L11)

___

### type

• **type**: `OperationTypeNode`

#### Inherited from

[JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig).[type](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#type)

#### Defined in

[packages/loaders/json-schema/src/types.ts:5](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L5)
