---
title: 'JsonSchemaPubSubOperation'
---

# Interface: JsonSchemaPubSubOperation

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).JsonSchemaPubSubOperation

## Table of contents

### Properties

- [argTypeMap](types_src.YamlConfig.JsonSchemaPubSubOperation#argtypemap)
- [description](types_src.YamlConfig.JsonSchemaPubSubOperation#description)
- [field](types_src.YamlConfig.JsonSchemaPubSubOperation#field)
- [pubsubTopic](types_src.YamlConfig.JsonSchemaPubSubOperation#pubsubtopic)
- [requestBaseBody](types_src.YamlConfig.JsonSchemaPubSubOperation#requestbasebody)
- [requestSample](types_src.YamlConfig.JsonSchemaPubSubOperation#requestsample)
- [requestSchema](types_src.YamlConfig.JsonSchemaPubSubOperation#requestschema)
- [requestTypeName](types_src.YamlConfig.JsonSchemaPubSubOperation#requesttypename)
- [responseSample](types_src.YamlConfig.JsonSchemaPubSubOperation#responsesample)
- [responseSchema](types_src.YamlConfig.JsonSchemaPubSubOperation#responseschema)
- [responseTypeName](types_src.YamlConfig.JsonSchemaPubSubOperation#responsetypename)
- [type](types_src.YamlConfig.JsonSchemaPubSubOperation#type)

## Properties

### argTypeMap

• `Optional` **argTypeMap**: `Object`

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:517](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L517)

___

### description

• `Optional` **description**: `string`

#### Defined in

[packages/types/src/config.ts:501](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L501)

___

### field

• **field**: `string`

#### Defined in

[packages/types/src/config.ts:500](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L500)

___

### pubsubTopic

• **pubsubTopic**: `string`

#### Defined in

[packages/types/src/config.ts:520](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L520)

___

### requestBaseBody

• `Optional` **requestBaseBody**: `any`

This body will be merged with the request body sent with
the underlying HTTP request

#### Defined in

[packages/types/src/config.ts:513](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L513)

___

### requestSample

• `Optional` **requestSample**: `any`

#### Defined in

[packages/types/src/config.ts:507](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L507)

___

### requestSchema

• `Optional` **requestSchema**: `any`

#### Defined in

[packages/types/src/config.ts:506](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L506)

___

### requestTypeName

• `Optional` **requestTypeName**: `string`

#### Defined in

[packages/types/src/config.ts:508](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L508)

___

### responseSample

• `Optional` **responseSample**: `any`

#### Defined in

[packages/types/src/config.ts:515](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L515)

___

### responseSchema

• `Optional` **responseSchema**: `any`

#### Defined in

[packages/types/src/config.ts:514](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L514)

___

### responseTypeName

• `Optional` **responseTypeName**: `string`

#### Defined in

[packages/types/src/config.ts:516](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L516)

___

### type

• **type**: ``"Query"`` \| ``"Mutation"`` \| ``"Subscription"``

Allowed values: Query, Mutation, Subscription

#### Defined in

[packages/types/src/config.ts:505](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L505)
