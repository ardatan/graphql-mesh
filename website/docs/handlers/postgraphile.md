---
id: postgraphile
title: PostgreSQL / PostGraphile
sidebar_label: PostgreSQL / PostGraphile
---
![image](https://user-images.githubusercontent.com/20847995/79219670-5ae06300-7e5b-11ea-81f1-d0c08a884607.png)

This handler allows you to use GraphQL schema created by [PostGraphile](https://graphile.org/postgraphile), based on a PostgreSQL database schema.

To get started, install the handler library from NPM:

```sh
yarn add @graphql-mesh/postgraphile
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: MyDb
    handler:
      postgraphile:
        connectionString: postgres://postgres:password@localhost/postgres
```

> You can check out our example that uses schema stitching with a PostgreSQL datasource.
[Click here to open the example on GitHub](https://github.com/Urigo/graphql-mesh/tree/master/examples/postgres-geodb)

## External Plugins (e.g. FederationPlugin, PgManyToManyPlugin, PostgisPlugin)
You can add [PostGraphile plugins](https://graphile.org/postgraphile/community-plugins) for example FederationPlugin. You can install it using npm or yarn like below;

```sh
yarn add @graphile/federation
```

and add those in your configuration file;

```yml
sources:
  - name: MyDb
    handler:
      postgraphile:
        connectionString: postgres://postgres:password@localhost/postgres
        appendPlugins:
          - "@graphile/federation"
```

[Learn more about PostGraphile plugins](https://graphile.org/postgraphile/extending)

### Federation and Automatic Type Merging support
Federation plugin converts your Postgraphile schema into a federated schema that can also be recognized by Stitching and this brings Automatic Type Merging. So you can install `@graphile/federation` package like above and add it under `appendPlugins`

### Many-to-Many support
If you want to have automatic many-to-many mapping across your entities. You can install `@graphile-contrib/pg-many-to-many` with `yarn add @graphile-contrib/pg-many-to-many` and add it under `appendPlugins`

### PostGIS Support
If you use `PostGIS` in your PostgreSQL database, you need to install `@graphile/postgis` package and add it under `appendPlugins`.

> See more [plugins](https://graphile.org/postgraphile/community-plugins) to improve the experience!

## Config API Reference

{@import ../generated-markdown/PostGraphileHandler.generated.md}
