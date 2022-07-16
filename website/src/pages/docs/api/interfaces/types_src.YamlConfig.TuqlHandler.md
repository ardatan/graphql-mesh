---
title: 'TuqlHandler'
---

# Interface: TuqlHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).TuqlHandler

Handler for SQLite database, based on `tuql`

## Table of contents

### Properties

- [db](types_src.YamlConfig.TuqlHandler#db)
- [infile](types_src.YamlConfig.TuqlHandler#infile)

## Properties

### db

• `Optional` **db**: `string`

Pointer to your SQLite database

#### Defined in

[packages/types/src/config.ts:1151](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1151)

___

### infile

• `Optional` **infile**: `string`

Path to the SQL Dump file if you want to build a in-memory database

#### Defined in

[packages/types/src/config.ts:1155](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1155)
