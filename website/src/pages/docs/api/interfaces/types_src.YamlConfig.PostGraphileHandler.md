---
title: 'PostGraphileHandler'
---

# Interface: PostGraphileHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).PostGraphileHandler

Handler for Postgres database, based on `postgraphile`

## Table of contents

### Properties

- [appendPlugins](types_src.YamlConfig.PostGraphileHandler#appendplugins)
- [connectionString](types_src.YamlConfig.PostGraphileHandler#connectionstring)
- [live](types_src.YamlConfig.PostGraphileHandler#live)
- [options](types_src.YamlConfig.PostGraphileHandler#options)
- [pool](types_src.YamlConfig.PostGraphileHandler#pool)
- [schemaName](types_src.YamlConfig.PostGraphileHandler#schemaname)
- [skipPlugins](types_src.YamlConfig.PostGraphileHandler#skipplugins)
- [subscriptions](types_src.YamlConfig.PostGraphileHandler#subscriptions)

## Properties

### appendPlugins

• `Optional` **appendPlugins**: `string`[]

Extra Postgraphile Plugins to append

#### Defined in

[packages/types/src/config.ts:954](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L954)

___

### connectionString

• `Optional` **connectionString**: `string`

A connection string to your Postgres database

#### Defined in

[packages/types/src/config.ts:942](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L942)

___

### live

• `Optional` **live**: `boolean`

Enables live-query support via GraphQL subscriptions (sends updated payload any time nested collections/records change) (default: true)

#### Defined in

[packages/types/src/config.ts:974](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L974)

___

### options

• `Optional` **options**: `string` \| \{ `[k: string]`: `any`;  }

Extra Postgraphile options that will be added to the postgraphile constructor. It can either be an object or a string pointing to the object's path (e.g. "./my-config#options"). See the [postgraphile docs](https://www.graphile.org/postgraphile/usage-library/) for more information. (Any of: JSON, String)

#### Defined in

[packages/types/src/config.ts:962](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L962)

___

### pool

• `Optional` **pool**: `any`

Connection Pool instance or settings or you can provide the path of a code file that exports any of those

#### Defined in

[packages/types/src/config.ts:950](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L950)

___

### schemaName

• `Optional` **schemaName**: `string`[]

An array of strings which specifies the PostgreSQL schemas that PostGraphile will use to create a GraphQL schema. The default schema is the public schema.

#### Defined in

[packages/types/src/config.ts:946](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L946)

___

### skipPlugins

• `Optional` **skipPlugins**: `string`[]

Postgraphile Plugins to skip (e.g. "graphile-build#NodePlugin")

#### Defined in

[packages/types/src/config.ts:958](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L958)

___

### subscriptions

• `Optional` **subscriptions**: `boolean`

Enable GraphQL websocket transport support for subscriptions (default: true)

#### Defined in

[packages/types/src/config.ts:970](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L970)
