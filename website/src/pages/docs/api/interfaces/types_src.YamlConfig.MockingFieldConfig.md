---
title: 'MockingFieldConfig'
---

# Interface: MockingFieldConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).MockingFieldConfig

## Table of contents

### Properties

- [apply](types_src.YamlConfig.MockingFieldConfig#apply)
- [custom](types_src.YamlConfig.MockingFieldConfig#custom)
- [faker](types_src.YamlConfig.MockingFieldConfig#faker)
- [if](types_src.YamlConfig.MockingFieldConfig#if)
- [length](types_src.YamlConfig.MockingFieldConfig#length)
- [store](types_src.YamlConfig.MockingFieldConfig#store)
- [updateStore](types_src.YamlConfig.MockingFieldConfig#updatestore)

## Properties

### apply

• **apply**: `string`

Resolver path
Example: User.firstName

#### Defined in

[packages/types/src/config.ts:1361](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1361)

___

### custom

• `Optional` **custom**: `string`

Custom mocking
It can be a module or json file.
Both "moduleName#exportName" or only "moduleName" would work

#### Defined in

[packages/types/src/config.ts:1380](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1380)

___

### faker

• `Optional` **faker**: `string`

Faker.js expression or function
Read more (https://github.com/marak/Faker.js/#fakerfake)
Example:
faker: name.firstName
faker: "\{\{ name.firstName }} \{\{ name.lastName }}"

#### Defined in

[packages/types/src/config.ts:1374](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1374)

___

### if

• `Optional` **if**: `boolean`

If this expression is truthy, mocking would be enabled
You can use environment variables expression, for example: `${MOCKING_ENABLED}`

#### Defined in

[packages/types/src/config.ts:1366](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1366)

___

### length

• `Optional` **length**: `number`

Length of the mock list
For the list types `[ObjectType]`, how many `ObjectType` you want to return?
default: 2

#### Defined in

[packages/types/src/config.ts:1386](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1386)

___

### store

• `Optional` **store**: [`GetFromMockStoreConfig`](types_src.YamlConfig.GetFromMockStoreConfig)

#### Defined in

[packages/types/src/config.ts:1387](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1387)

___

### updateStore

• `Optional` **updateStore**: [`UpdateMockStoreConfig`](types_src.YamlConfig.UpdateMockStoreConfig)[]

Update the data on the mock store

#### Defined in

[packages/types/src/config.ts:1391](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1391)
