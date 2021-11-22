---
title: 'WebhookHandler'
---

# Interface: WebhookHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).WebhookHandler

## Table of contents

### Properties

- [method](types_src.YamlConfig.WebhookHandler#method)
- [path](types_src.YamlConfig.WebhookHandler#path)
- [payload](types_src.YamlConfig.WebhookHandler#payload)
- [pubsubTopic](types_src.YamlConfig.WebhookHandler#pubsubtopic)

## Properties

### method

• `Optional` **method**: ``"GET"`` \| ``"POST"`` \| ``"DELETE"`` \| ``"PATCH"``

HTTP Method that the handler will control (Allowed values: GET, POST, DELETE, PATCH)

#### Defined in

[packages/types/src/config.ts:133](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L133)

___

### path

• **path**: `string`

Path that remote API will ping

#### Defined in

[packages/types/src/config.ts:129](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L129)

___

### payload

• `Optional` **payload**: `string`

Part of the object you want to pass (e.g. `data.messages`)

#### Defined in

[packages/types/src/config.ts:141](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L141)

___

### pubsubTopic

• **pubsubTopic**: `string`

Name of the topic you want to pass incoming payload

#### Defined in

[packages/types/src/config.ts:137](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L137)
