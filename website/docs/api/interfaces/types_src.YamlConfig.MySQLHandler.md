---
title: 'MySQLHandler'
---

# Interface: MySQLHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).MySQLHandler

## Table of contents

### Properties

- [database](types_src.YamlConfig.MySQLHandler#database)
- [host](types_src.YamlConfig.MySQLHandler#host)
- [password](types_src.YamlConfig.MySQLHandler#password)
- [pool](types_src.YamlConfig.MySQLHandler#pool)
- [port](types_src.YamlConfig.MySQLHandler#port)
- [tableFields](types_src.YamlConfig.MySQLHandler#tablefields)
- [tables](types_src.YamlConfig.MySQLHandler#tables)
- [user](types_src.YamlConfig.MySQLHandler#user)

## Properties

### database

• `Optional` **database**: `string`

#### Defined in

[packages/types/src/config.ts:747](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L747)

___

### host

• `Optional` **host**: `string`

#### Defined in

[packages/types/src/config.ts:743](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L743)

___

### password

• `Optional` **password**: `string`

#### Defined in

[packages/types/src/config.ts:746](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L746)

___

### pool

• `Optional` **pool**: `any`

Use existing `Pool` instance
Format: modulePath#exportName

#### Defined in

[packages/types/src/config.ts:752](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L752)

___

### port

• `Optional` **port**: `number`

#### Defined in

[packages/types/src/config.ts:744](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L744)

___

### tableFields

• `Optional` **tableFields**: [`TableField`](types_src.YamlConfig.TableField)[]

Use specific fields of specific tables

#### Defined in

[packages/types/src/config.ts:760](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L760)

___

### tables

• `Optional` **tables**: `string`[]

Use specific tables for your schema

#### Defined in

[packages/types/src/config.ts:756](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L756)

___

### user

• `Optional` **user**: `string`

#### Defined in

[packages/types/src/config.ts:745](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L745)
