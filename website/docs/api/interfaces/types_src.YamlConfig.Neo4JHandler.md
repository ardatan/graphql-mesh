---
title: 'Neo4JHandler'
---

# Interface: Neo4JHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).Neo4JHandler

Handler for Neo4j

## Table of contents

### Properties

- [alwaysIncludeRelationships](types_src.YamlConfig.Neo4JHandler#alwaysincluderelationships)
- [database](types_src.YamlConfig.Neo4JHandler#database)
- [password](types_src.YamlConfig.Neo4JHandler#password)
- [typeDefs](types_src.YamlConfig.Neo4JHandler#typedefs)
- [url](types_src.YamlConfig.Neo4JHandler#url)
- [username](types_src.YamlConfig.Neo4JHandler#username)

## Properties

### alwaysIncludeRelationships

• `Optional` **alwaysIncludeRelationships**: `boolean`

Specifies whether relationships should always be included in the type definitions as [relationship](https://grandstack.io/docs/neo4j-graphql-js.html#relationship-types) types, even if the relationships do not have properties.

#### Defined in

[packages/types/src/config.ts:681](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L681)

___

### database

• `Optional` **database**: `string`

Specifies database name

#### Defined in

[packages/types/src/config.ts:685](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L685)

___

### password

• **password**: `string`

Password for basic authentication

#### Defined in

[packages/types/src/config.ts:677](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L677)

___

### typeDefs

• `Optional` **typeDefs**: `string`

Provide GraphQL Type Definitions instead of inferring

#### Defined in

[packages/types/src/config.ts:689](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L689)

___

### url

• **url**: `string`

URL for the Neo4j Instance e.g. neo4j://localhost

#### Defined in

[packages/types/src/config.ts:669](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L669)

___

### username

• **username**: `string`

Username for basic authentication

#### Defined in

[packages/types/src/config.ts:673](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L673)
