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

[packages/types/src/config.ts:971](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L971)

___

### infile

• `Optional` **infile**: `string`

Path to the SQL Dump file if you want to build a in-memory database

#### Defined in

[packages/types/src/config.ts:975](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L975)
