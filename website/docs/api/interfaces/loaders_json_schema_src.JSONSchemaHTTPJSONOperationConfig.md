---
title: 'JSONSchemaHTTPJSONOperationConfig'
---

# Interface: JSONSchemaHTTPJSONOperationConfig

[loaders/json-schema/src](../modules/loaders_json_schema_src).JSONSchemaHTTPJSONOperationConfig

## Hierarchy

- [`JSONSchemaHTTPBaseOperationConfig`](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig)

- [`JSONSchemaBaseOperationConfigWithJSONRequest`](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest)

  ↳ **`JSONSchemaHTTPJSONOperationConfig`**

## Table of contents

### Properties

- [argTypeMap](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#argtypemap)
- [description](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#description)
- [field](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#field)
- [headers](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#headers)
- [method](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#method)
- [path](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#path)
- [requestSample](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#requestsample)
- [requestSchema](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#requestschema)
- [requestTypeName](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#requesttypename)
- [responseSample](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#responsesample)
- [responseSchema](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#responseschema)
- [responseTypeName](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#responsetypename)
- [type](loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig#type)

## Properties

### argTypeMap

• `Optional` **argTypeMap**: `Record`<`string`, `string`\>

#### Inherited from

[JSONSchemaBaseOperationConfigWithJSONRequest](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest).[argTypeMap](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest#argtypemap)

#### Defined in

[packages/loaders/json-schema/src/types.ts:13](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L13)

___

### description

• `Optional` **description**: `string`

#### Inherited from

[JSONSchemaBaseOperationConfigWithJSONRequest](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest).[description](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest#description)

#### Defined in

[packages/loaders/json-schema/src/types.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L7)

___

### field

• **field**: `string`

#### Inherited from

[JSONSchemaBaseOperationConfigWithJSONRequest](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest).[field](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest#field)

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

#### Inherited from

[JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig).[method](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#method)

#### Defined in

[packages/loaders/json-schema/src/types.ts:26](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L26)

___

### path

• **path**: `string`

#### Inherited from

[JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig).[path](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig#path)

#### Defined in

[packages/loaders/json-schema/src/types.ts:25](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L25)

___

### requestSample

• `Optional` **requestSample**: `any`

#### Inherited from

[JSONSchemaBaseOperationConfigWithJSONRequest](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest).[requestSample](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest#requestsample)

#### Defined in

[packages/loaders/json-schema/src/types.ts:18](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L18)

___

### requestSchema

• `Optional` **requestSchema**: `string` \| [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Inherited from

[JSONSchemaBaseOperationConfigWithJSONRequest](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest).[requestSchema](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest#requestschema)

#### Defined in

[packages/loaders/json-schema/src/types.ts:17](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L17)

___

### requestTypeName

• `Optional` **requestTypeName**: `string`

#### Inherited from

[JSONSchemaBaseOperationConfigWithJSONRequest](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest).[requestTypeName](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest#requesttypename)

#### Defined in

[packages/loaders/json-schema/src/types.ts:19](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L19)

___

### responseSample

• `Optional` **responseSample**: `any`

#### Inherited from

[JSONSchemaBaseOperationConfigWithJSONRequest](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest).[responseSample](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest#responsesample)

#### Defined in

[packages/loaders/json-schema/src/types.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L10)

___

### responseSchema

• `Optional` **responseSchema**: `string` \| [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Inherited from

[JSONSchemaBaseOperationConfigWithJSONRequest](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest).[responseSchema](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest#responseschema)

#### Defined in

[packages/loaders/json-schema/src/types.ts:9](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L9)

___

### responseTypeName

• `Optional` **responseTypeName**: `string`

#### Inherited from

[JSONSchemaBaseOperationConfigWithJSONRequest](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest).[responseTypeName](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest#responsetypename)

#### Defined in

[packages/loaders/json-schema/src/types.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L11)

___

### type

• **type**: `OperationTypeNode`

#### Inherited from

[JSONSchemaBaseOperationConfigWithJSONRequest](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest).[type](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest#type)

#### Defined in

[packages/loaders/json-schema/src/types.ts:5](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L5)
