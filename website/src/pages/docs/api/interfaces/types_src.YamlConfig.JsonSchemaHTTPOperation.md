---
title: 'JsonSchemaHTTPOperation'
---

# Interface: JsonSchemaHTTPOperation

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).JsonSchemaHTTPOperation

## Table of contents

### Properties

- [argTypeMap](types_src.YamlConfig.JsonSchemaHTTPOperation#argtypemap)
- [binary](types_src.YamlConfig.JsonSchemaHTTPOperation#binary)
- [description](types_src.YamlConfig.JsonSchemaHTTPOperation#description)
- [exposeResponseMetadata](types_src.YamlConfig.JsonSchemaHTTPOperation#exposeresponsemetadata)
- [field](types_src.YamlConfig.JsonSchemaHTTPOperation#field)
- [headers](types_src.YamlConfig.JsonSchemaHTTPOperation#headers)
- [method](types_src.YamlConfig.JsonSchemaHTTPOperation#method)
- [path](types_src.YamlConfig.JsonSchemaHTTPOperation#path)
- [requestBaseBody](types_src.YamlConfig.JsonSchemaHTTPOperation#requestbasebody)
- [requestSample](types_src.YamlConfig.JsonSchemaHTTPOperation#requestsample)
- [requestSchema](types_src.YamlConfig.JsonSchemaHTTPOperation#requestschema)
- [requestTypeName](types_src.YamlConfig.JsonSchemaHTTPOperation#requesttypename)
- [responseByStatusCode](types_src.YamlConfig.JsonSchemaHTTPOperation#responsebystatuscode)
- [responseSample](types_src.YamlConfig.JsonSchemaHTTPOperation#responsesample)
- [responseSchema](types_src.YamlConfig.JsonSchemaHTTPOperation#responseschema)
- [responseTypeName](types_src.YamlConfig.JsonSchemaHTTPOperation#responsetypename)
- [type](types_src.YamlConfig.JsonSchemaHTTPOperation#type)

## Properties

### argTypeMap

• `Optional` **argTypeMap**: `Object`

Mapping the JSON Schema and define the arguments of the operation.
Example: 'argTypeMap: ID: String'

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:481](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L481)

___

### binary

• `Optional` **binary**: `boolean`

If true, this operation cannot have requestSchema or requestSample
And the request body will be passed as binary with its mime type
unless you define an explicit Content-Type header

#### Defined in

[packages/types/src/config.ts:497](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L497)

___

### description

• `Optional` **description**: `string`

Your chance to describe the operation!
Make sure the description is clear and concise.

#### Defined in

[packages/types/src/config.ts:410](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L410)

___

### exposeResponseMetadata

• `Optional` **exposeResponseMetadata**: `boolean`

Expose response details done to the upstream API
When you enable this, you will see a new field in the response type;
```graphql
type MyResponseType {
  myFooField: String
  _response: ResponseMetadata
}

# And a new type for the response metadata object
type ResponseMetadata {
  url: URL
  status: Int
  method: String
  headers: JSON
  body: String
}
```

#### Defined in

[packages/types/src/config.ts:476](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L476)

___

### field

• **field**: `string`

This Field based on the field name of the URL path.
Example: "https://MyAPIURL.com/FieldNameHere/",
so we will set the "field: FieldNameHere".

#### Defined in

[packages/types/src/config.ts:405](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L405)

___

### headers

• `Optional` **headers**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:489](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L489)

___

### method

• `Optional` **method**: ``"GET"`` \| ``"POST"`` \| ``"DELETE"`` \| ``"PATCH"`` \| ``"HEAD"`` \| ``"PUT"`` \| ``"CONNECT"`` \| ``"OPTIONS"`` \| ``"TRACE"``

Allowed values: GET, HEAD, POST, PUT, DELETE, CONNECT, OPTIONS, TRACE, PATCH

#### Defined in

[packages/types/src/config.ts:488](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L488)

___

### path

• **path**: `string`

#### Defined in

[packages/types/src/config.ts:484](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L484)

___

### requestBaseBody

• `Optional` **requestBaseBody**: `any`

This body will be merged with the request body sent with
the underlying HTTP request

#### Defined in

[packages/types/src/config.ts:432](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L432)

___

### requestSample

• `Optional` **requestSample**: `any`

The path definition of the JSON Schema sample.
Example: "./jsons/questions.response.json".

#### Defined in

[packages/types/src/config.ts:423](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L423)

___

### requestSchema

• `Optional` **requestSchema**: `any`

Your chance to provide request schema name.

#### Defined in

[packages/types/src/config.ts:418](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L418)

___

### requestTypeName

• `Optional` **requestTypeName**: `string`

Inset any name for the type of the request body.

#### Defined in

[packages/types/src/config.ts:427](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L427)

___

### responseByStatusCode

• `Optional` **responseByStatusCode**: `any`

You can define your response schemas by status codes;
```yaml
responseByStatusCode:
  200:
    responseSchema: ./someschema.json#/somepath
  404:
    responseSample: ./error-sample.json
    responseTypeName: MyError
```

#### Defined in

[packages/types/src/config.ts:456](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L456)

___

### responseSample

• `Optional` **responseSample**: `any`

Did you use Sample? Provide the response sample path.

#### Defined in

[packages/types/src/config.ts:440](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L440)

___

### responseSchema

• `Optional` **responseSchema**: `any`

Yay! Now you can provide the response schema name.

#### Defined in

[packages/types/src/config.ts:436](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L436)

___

### responseTypeName

• `Optional` **responseTypeName**: `string`

Inset any name for the type of the response body.

#### Defined in

[packages/types/src/config.ts:444](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L444)

___

### type

• **type**: ``"Query"`` \| ``"Mutation"`` \| ``"Subscription"``

Type field is set the opertion type: Query, Mutation or Subscription. (Allowed values: Query, Mutation, Subscription)

#### Defined in

[packages/types/src/config.ts:414](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L414)
