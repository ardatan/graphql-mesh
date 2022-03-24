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

[packages/types/src/config.ts:643](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L643)

___

### host

• `Optional` **host**: `string`

#### Defined in

[packages/types/src/config.ts:639](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L639)

___

### password

• `Optional` **password**: `string`

#### Defined in

[packages/types/src/config.ts:642](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L642)

___

### pool

• `Optional` **pool**: `any`

Use existing `Pool` instance
Format: modulePath#exportName

#### Defined in

[packages/types/src/config.ts:648](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L648)

___

### port

• `Optional` **port**: `number`

#### Defined in

[packages/types/src/config.ts:640](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L640)

___

### tableFields

• `Optional` **tableFields**: [`TableField`](types_src.YamlConfig.TableField)[]

Use specific fields of specific tables

#### Defined in

[packages/types/src/config.ts:656](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L656)

___

### tables

• `Optional` **tables**: `string`[]

Use specific tables for your schema

#### Defined in

[packages/types/src/config.ts:652](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L652)

___

### user

• `Optional` **user**: `string`

#### Defined in

[packages/types/src/config.ts:641](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L641)
