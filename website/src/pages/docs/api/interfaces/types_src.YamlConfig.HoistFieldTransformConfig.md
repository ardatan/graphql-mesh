---
title: 'HoistFieldTransformConfig'
---

# Interface: HoistFieldTransformConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).HoistFieldTransformConfig

## Table of contents

### Properties

- [alias](types_src.YamlConfig.HoistFieldTransformConfig#alias)
- [filterArgsInPath](types_src.YamlConfig.HoistFieldTransformConfig#filterargsinpath)
- [newFieldName](types_src.YamlConfig.HoistFieldTransformConfig#newfieldname)
- [pathConfig](types_src.YamlConfig.HoistFieldTransformConfig#pathconfig)
- [typeName](types_src.YamlConfig.HoistFieldTransformConfig#typename)

## Properties

### alias

• `Optional` **alias**: `string`

#### Defined in

[packages/types/src/config.ts:1317](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1317)

___

### filterArgsInPath

• `Optional` **filterArgsInPath**: `boolean`

Defines if args in path are filtered (default = false)

#### Defined in

[packages/types/src/config.ts:1321](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1321)

___

### newFieldName

• **newFieldName**: `string`

Name the hoisted field should have when hoisted to the type specified in typeName

#### Defined in

[packages/types/src/config.ts:1316](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1316)

___

### pathConfig

• **pathConfig**: (`string` \| [`HoistFieldTransformFieldPathConfigObject`](types_src.YamlConfig.HoistFieldTransformFieldPathConfigObject))[]

Array of fieldsNames to reach the field to be hoisted (Any of: String, HoistFieldTransformFieldPathConfigObject)

#### Defined in

[packages/types/src/config.ts:1312](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1312)

___

### typeName

• **typeName**: `string`

Type name that defines where field should be hoisted to

#### Defined in

[packages/types/src/config.ts:1308](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1308)
