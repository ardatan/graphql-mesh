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

[packages/types/src/config.ts:785](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L785)

___

### database

• `Optional` **database**: `string`

Specifies database name

#### Defined in

[packages/types/src/config.ts:789](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L789)

___

### password

• **password**: `string`

Password for basic authentication

#### Defined in

[packages/types/src/config.ts:781](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L781)

___

### typeDefs

• `Optional` **typeDefs**: `string`

Provide GraphQL Type Definitions instead of inferring

#### Defined in

[packages/types/src/config.ts:793](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L793)

___

### url

• **url**: `string`

URL for the Neo4j Instance e.g. neo4j://localhost

#### Defined in

[packages/types/src/config.ts:773](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L773)

___

### username

• **username**: `string`

Username for basic authentication

#### Defined in

[packages/types/src/config.ts:777](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L777)
