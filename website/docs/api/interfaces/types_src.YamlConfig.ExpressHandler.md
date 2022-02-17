---
title: 'ExpressHandler'
---

# Interface: ExpressHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).ExpressHandler

## Table of contents

### Properties

- [handler](types_src.YamlConfig.ExpressHandler#handler)
- [method](types_src.YamlConfig.ExpressHandler#method)
- [path](types_src.YamlConfig.ExpressHandler#path)

## Properties

### handler

• **handler**: `string`

Path of the handler's code

#### Defined in

[packages/types/src/config.ts:151](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L151)

___

### method

• `Optional` **method**: ``"GET"`` \| ``"POST"`` \| ``"DELETE"`` \| ``"PATCH"``

HTTP Method that the handler will control (Allowed values: GET, POST, DELETE, PATCH)

#### Defined in

[packages/types/src/config.ts:155](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L155)

___

### path

• **path**: `string`

Path that the handler will control

#### Defined in

[packages/types/src/config.ts:147](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L147)
