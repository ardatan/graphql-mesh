---
title: 'JSONSchemaHTTPBaseOperationConfig'
---

# Interface: JSONSchemaHTTPBaseOperationConfig

[loaders/json-schema/src](../modules/loaders_json_schema_src).JSONSchemaHTTPBaseOperationConfig

## Hierarchy

- [`JSONSchemaBaseOperationConfig`](loaders_json_schema_src.JSONSchemaBaseOperationConfig)

  ↳ **`JSONSchemaHTTPBaseOperationConfig`**

  ↳↳ [`JSONSchemaHTTPJSONOperationConfig`](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig)

  ↳↳ [`JSONSchemaHTTPBinaryConfig`](loaders_json_schema_src.JSONSchemaHTTPBinaryConfig)

## Table of contents

### Properties

- [argTypeMap](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#argtypemap)
- [description](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#description)
- [field](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#field)
- [headers](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#headers)
- [method](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#method)
- [path](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#path)
- [responseSample](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#responsesample)
- [responseSchema](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#responseschema)
- [responseTypeName](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#responsetypename)
- [type](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#type)

## Properties

### argTypeMap

• `Optional` **argTypeMap**: `Record`<`string`, `string`\>

#### Inherited from

[JSONSchemaBaseOperationConfig](loaders_json_schema_src.JSONSchemaBaseOperationConfig).[argTypeMap](loaders_json_schema_src.JSONSchemaBaseOperationConfig#argtypemap)

#### Defined in

[packages/loaders/json-schema/src/types.ts:13](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L13)

___

### description

• `Optional` **description**: `string`

#### Inherited from

[JSONSchemaBaseOperationConfig](loaders_json_schema_src.JSONSchemaBaseOperationConfig).[description](loaders_json_schema_src.JSONSchemaBaseOperationConfig#description)

#### Defined in

[packages/loaders/json-schema/src/types.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L7)

___

### field

• **field**: `string`

#### Inherited from

[JSONSchemaBaseOperationConfig](loaders_json_schema_src.JSONSchemaBaseOperationConfig).[field](loaders_json_schema_src.JSONSchemaBaseOperationConfig#field)

#### Defined in

[packages/loaders/json-schema/src/types.ts:6](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L6)

___

### headers

• `Optional` **headers**: `Record`<`string`, `string`\>

#### Defined in

[packages/loaders/json-schema/src/types.ts:28](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L28)

___

### method

• `Optional` **method**: [`HTTPMethod`](../modules/loaders_json_schema_src#httpmethod)

#### Defined in

[packages/loaders/json-schema/src/types.ts:26](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L26)

___

### path

• **path**: `string`

#### Defined in

[packages/loaders/json-schema/src/types.ts:25](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L25)

___

### responseSample

• `Optional` **responseSample**: `any`

#### Inherited from

[JSONSchemaBaseOperationConfig](loaders_json_schema_src.JSONSchemaBaseOperationConfig).[responseSample](loaders_json_schema_src.JSONSchemaBaseOperationConfig#responsesample)

#### Defined in

[packages/loaders/json-schema/src/types.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L10)

___

### responseSchema

• `Optional` **responseSchema**: `string` \| [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Inherited from

[JSONSchemaBaseOperationConfig](loaders_json_schema_src.JSONSchemaBaseOperationConfig).[responseSchema](loaders_json_schema_src.JSONSchemaBaseOperationConfig#responseschema)

#### Defined in

[packages/loaders/json-schema/src/types.ts:9](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L9)

___

### responseTypeName

• `Optional` **responseTypeName**: `string`

#### Inherited from

[JSONSchemaBaseOperationConfig](loaders_json_schema_src.JSONSchemaBaseOperationConfig).[responseTypeName](loaders_json_schema_src.JSONSchemaBaseOperationConfig#responsetypename)

#### Defined in

[packages/loaders/json-schema/src/types.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L11)

___

### type

• **type**: `OperationTypeNode`

#### Inherited from

[JSONSchemaBaseOperationConfig](loaders_json_schema_src.JSONSchemaBaseOperationConfig).[type](loaders_json_schema_src.JSONSchemaBaseOperationConfig#type)

#### Defined in

[packages/loaders/json-schema/src/types.ts:5](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L5)
