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

[packages/types/src/config.ts:1238](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1238)

___

### custom

• `Optional` **custom**: `string`

Custom mocking
It can be a module or json file.
Both "moduleName#exportName" or only "moduleName" would work

#### Defined in

[packages/types/src/config.ts:1257](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1257)

___

### faker

• `Optional` **faker**: `string`

Faker.js expression or function
Read more (https://github.com/marak/Faker.js/#fakerfake)
Example;
faker: name.firstName
faker: "{{ name.firstName }} {{ name.lastName }}"

#### Defined in

[packages/types/src/config.ts:1251](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1251)

___

### if

• `Optional` **if**: `boolean`

If this expression is truthy, mocking would be enabled
You can use environment variables expression, for example: `${MOCKING_ENABLED}`

#### Defined in

[packages/types/src/config.ts:1243](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1243)

___

### length

• `Optional` **length**: `number`

Length of the mock list
For the list types `[ObjectType]`, how many `ObjectType` you want to return?
default: 2

#### Defined in

[packages/types/src/config.ts:1263](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1263)

___

### store

• `Optional` **store**: [`GetFromMockStoreConfig`](types_src.YamlConfig.GetFromMockStoreConfig)

#### Defined in

[packages/types/src/config.ts:1264](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1264)

___

### updateStore

• `Optional` **updateStore**: [`UpdateMockStoreConfig`](types_src.YamlConfig.UpdateMockStoreConfig)[]

Update the data on the mock store

#### Defined in

[packages/types/src/config.ts:1268](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1268)
