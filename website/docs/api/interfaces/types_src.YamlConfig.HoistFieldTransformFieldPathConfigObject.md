---
title: 'HoistFieldTransformFieldPathConfigObject'
---

# Interface: HoistFieldTransformFieldPathConfigObject

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).HoistFieldTransformFieldPathConfigObject

## Table of contents

### Properties

- [fieldName](types_src.YamlConfig.HoistFieldTransformFieldPathConfigObject#fieldname)
- [filterArgs](types_src.YamlConfig.HoistFieldTransformFieldPathConfigObject#filterargs)

## Properties

### fieldName

• **fieldName**: `string`

Field name

#### Defined in

[packages/types/src/config.ts:1652](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1652)

___

### filterArgs

• **filterArgs**: `string`[]

Match fields based on argument, needs to implement `(arg: GraphQLArgument) => boolean`;

#### Defined in

[packages/types/src/config.ts:1656](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1656)
