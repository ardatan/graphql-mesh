---
title: 'MockingConfig'
---

# Interface: MockingConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).MockingConfig

Mock configuration for your source

## Table of contents

### Properties

- [if](types_src.YamlConfig.MockingConfig#if)
- [initializeStore](types_src.YamlConfig.MockingConfig#initializestore)
- [mocks](types_src.YamlConfig.MockingConfig#mocks)
- [preserveResolvers](types_src.YamlConfig.MockingConfig#preserveresolvers)

## Properties

### if

• `Optional` **if**: `boolean`

If this expression is truthy, mocking would be enabled
You can use environment variables expression, for example: `${MOCKING_ENABLED}`

#### Defined in

[packages/types/src/config.ts:1127](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1127)

___

### initializeStore

• `Optional` **initializeStore**: `any`

The path to the code runs before the store is attached to the schema

#### Defined in

[packages/types/src/config.ts:1140](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1140)

___

### mocks

• `Optional` **mocks**: [`MockingFieldConfig`](types_src.YamlConfig.MockingFieldConfig)[]

Mock configurations

#### Defined in

[packages/types/src/config.ts:1136](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1136)

___

### preserveResolvers

• `Optional` **preserveResolvers**: `boolean`

Do not mock any other resolvers other than defined in `mocks`.
For example, you can enable this if you don't want to mock entire schema but partially.

#### Defined in

[packages/types/src/config.ts:1132](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1132)
