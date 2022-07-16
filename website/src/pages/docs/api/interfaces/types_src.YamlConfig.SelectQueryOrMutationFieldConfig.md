---
title: 'SelectQueryOrMutationFieldConfig'
---

# Interface: SelectQueryOrMutationFieldConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).SelectQueryOrMutationFieldConfig

## Table of contents

### Properties

- [method](types_src.YamlConfig.SelectQueryOrMutationFieldConfig#method)
- [path](types_src.YamlConfig.SelectQueryOrMutationFieldConfig#path)
- [title](types_src.YamlConfig.SelectQueryOrMutationFieldConfig#title)
- [type](types_src.YamlConfig.SelectQueryOrMutationFieldConfig#type)

## Properties

### method

• `Optional` **method**: `string`

Which method is used for this operation

#### Defined in

[packages/types/src/config.ts:933](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L933)

___

### path

• `Optional` **path**: `string`

Operation Path

#### Defined in

[packages/types/src/config.ts:925](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L925)

___

### title

• `Optional` **title**: `string`

OAS Title

#### Defined in

[packages/types/src/config.ts:921](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L921)

___

### type

• `Optional` **type**: ``"Query"`` \| ``"Mutation"`` \| ``"query"`` \| ``"mutation"``

Target Root Type for this operation (Allowed values: query, mutation, Query, Mutation)

#### Defined in

[packages/types/src/config.ts:929](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L929)
