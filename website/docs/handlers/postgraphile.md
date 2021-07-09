---
id: postgraphile
title: PostgreSQL / PostGraphile
sidebar_label: PostgreSQL / PostGraphile
---
![image](https://user-images.githubusercontent.com/20847995/79219670-5ae06300-7e5b-11ea-81f1-d0c08a884607.png)

This handler allows you to use GraphQL schema created by [PostGraphile](https://www.graphile.org/postgraphile/), based on a PostgreSQL database schema.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/postgraphile
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

### External Plugins (e.g. ConnectionFilterPlugin)
You can add [PostGraphile plugins](https://www.graphile.org/postgraphile/community-plugins/) for example ConnectionFilterPlugin. You can install it using npm or yarn like below;

```sh
yarn add postgraphile-plugin-connection-filter
```

and add those in your configuration file;

```yml
sources:
  - name: MyDb
    handler:
      postgraphile:
        connectionString: postgres://postgres:password@localhost/postgres
        plugins:
          - "postgraphile-plugin-connection-filter"
```

> You don't need to have Federation plugin because it is already added by GraphQL Mesh.

[Learn more about PostGraphile plugins](https://www.graphile.org/postgraphile/extending/)

## Config API Reference

{@import ../generated-markdown/PostGraphileHandler.generated.md}
