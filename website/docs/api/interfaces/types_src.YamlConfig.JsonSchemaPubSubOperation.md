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

[packages/types/src/config.ts:427](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L427)

___

### description

• `Optional` **description**: `string`

#### Defined in

[packages/types/src/config.ts:412](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L412)

___

### field

• **field**: `string`

#### Defined in

[packages/types/src/config.ts:411](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L411)

___

### pubsubTopic

• **pubsubTopic**: `string`

#### Defined in

[packages/types/src/config.ts:430](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L430)

___

### requestBaseBody

• `Optional` **requestBaseBody**: `any`

This body will be merged with the request body sent with the underlying HTTP request

#### Defined in

[packages/types/src/config.ts:423](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L423)

___

### requestSample

• `Optional` **requestSample**: `any`

#### Defined in

[packages/types/src/config.ts:418](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L418)

___

### requestSchema

• `Optional` **requestSchema**: `any`

#### Defined in

[packages/types/src/config.ts:417](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L417)

___

### requestTypeName

• `Optional` **requestTypeName**: `string`

#### Defined in

[packages/types/src/config.ts:419](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L419)

___

### responseSample

• `Optional` **responseSample**: `any`

#### Defined in

[packages/types/src/config.ts:425](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L425)

___

### responseSchema

• `Optional` **responseSchema**: `any`

#### Defined in

[packages/types/src/config.ts:424](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L424)

___

### responseTypeName

• `Optional` **responseTypeName**: `string`

#### Defined in

[packages/types/src/config.ts:426](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L426)

___

### type

• **type**: ``"Query"`` | ``"Mutation"`` | ``"Subscription"``

Allowed values: Query, Mutation, Subscription

#### Defined in

[packages/types/src/config.ts:416](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L416)
