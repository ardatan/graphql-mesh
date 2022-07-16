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

[packages/types/src/config.ts:515](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L515)

___

### description

• `Optional` **description**: `string`

#### Defined in

[packages/types/src/config.ts:499](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L499)

___

### field

• **field**: `string`

#### Defined in

[packages/types/src/config.ts:498](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L498)

___

### pubsubTopic

• **pubsubTopic**: `string`

#### Defined in

[packages/types/src/config.ts:518](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L518)

___

### requestBaseBody

• `Optional` **requestBaseBody**: `any`

This body will be merged with the request body sent with
the underlying HTTP request

#### Defined in

[packages/types/src/config.ts:511](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L511)

___

### requestSample

• `Optional` **requestSample**: `any`

#### Defined in

[packages/types/src/config.ts:505](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L505)

___

### requestSchema

• `Optional` **requestSchema**: `any`

#### Defined in

[packages/types/src/config.ts:504](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L504)

___

### requestTypeName

• `Optional` **requestTypeName**: `string`

#### Defined in

[packages/types/src/config.ts:506](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L506)

___

### responseSample

• `Optional` **responseSample**: `any`

#### Defined in

[packages/types/src/config.ts:513](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L513)

___

### responseSchema

• `Optional` **responseSchema**: `any`

#### Defined in

[packages/types/src/config.ts:512](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L512)

___

### responseTypeName

• `Optional` **responseTypeName**: `string`

#### Defined in

[packages/types/src/config.ts:514](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L514)

___

### type

• **type**: ``"Query"`` \| ``"Mutation"`` \| ``"Subscription"``

Allowed values: Query, Mutation, Subscription

#### Defined in

[packages/types/src/config.ts:503](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L503)
