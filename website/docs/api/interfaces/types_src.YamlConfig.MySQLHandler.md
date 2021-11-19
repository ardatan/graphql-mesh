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

[packages/types/src/config.ts:610](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L610)

___

### host

• `Optional` **host**: `string`

#### Defined in

[packages/types/src/config.ts:606](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L606)

___

### password

• `Optional` **password**: `string`

#### Defined in

[packages/types/src/config.ts:609](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L609)

___

### pool

• `Optional` **pool**: `any`

Use existing `Pool` instance
Format: modulePath#exportName

#### Defined in

[packages/types/src/config.ts:615](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L615)

___

### port

• `Optional` **port**: `number`

#### Defined in

[packages/types/src/config.ts:607](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L607)

___

### tableFields

• `Optional` **tableFields**: [`TableField`](types_src.YamlConfig.TableField)[]

Use specific fields of specific tables

#### Defined in

[packages/types/src/config.ts:623](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L623)

___

### tables

• `Optional` **tables**: `string`[]

Use specific tables for your schema

#### Defined in

[packages/types/src/config.ts:619](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L619)

___

### user

• `Optional` **user**: `string`

#### Defined in

[packages/types/src/config.ts:608](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L608)
