---
title: 'JSONSchemaBaseOperationConfig'
---

# Interface: JSONSchemaBaseOperationConfig

[loaders/json-schema/src](../modules/loaders_json_schema_src).JSONSchemaBaseOperationConfig

## Hierarchy

- **`JSONSchemaBaseOperationConfig`**

  ↳ [`JSONSchemaBaseOperationConfigWithJSONRequest`](loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest)

  ↳ [`JSONSchemaHTTPBaseOperationConfig`](loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig)

## Table of contents

### Properties

- [argTypeMap](loaders_json_schema_src.JSONSchemaBaseOperationConfig#argtypemap)
- [description](loaders_json_schema_src.JSONSchemaBaseOperationConfig#description)
- [field](loaders_json_schema_src.JSONSchemaBaseOperationConfig#field)
- [responseSample](loaders_json_schema_src.JSONSchemaBaseOperationConfig#responsesample)
- [responseSchema](loaders_json_schema_src.JSONSchemaBaseOperationConfig#responseschema)
- [responseTypeName](loaders_json_schema_src.JSONSchemaBaseOperationConfig#responsetypename)
- [type](loaders_json_schema_src.JSONSchemaBaseOperationConfig#type)

## Properties

### argTypeMap

• `Optional` **argTypeMap**: `Record`<`string`, `string`\>

#### Defined in

[packages/loaders/json-schema/src/types.ts:13](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L13)

___

### description

• `Optional` **description**: `string`

#### Defined in

[packages/loaders/json-schema/src/types.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L7)

___

### field

• **field**: `string`

#### Defined in

[packages/loaders/json-schema/src/types.ts:6](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L6)

___

### responseSample

• `Optional` **responseSample**: `any`

#### Defined in

[packages/loaders/json-schema/src/types.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L10)

___

### responseSchema

• `Optional` **responseSchema**: `string` \| [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Defined in

[packages/loaders/json-schema/src/types.ts:9](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L9)

___

### responseTypeName

• `Optional` **responseTypeName**: `string`

#### Defined in

[packages/loaders/json-schema/src/types.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L11)

___

### type

• **type**: `OperationTypeNode`

#### Defined in

[packages/loaders/json-schema/src/types.ts:5](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L5)
