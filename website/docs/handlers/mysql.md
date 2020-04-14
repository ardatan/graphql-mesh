---
id: mysql
title: MySQL
sidebar_label: MySQL
---
![image](https://user-images.githubusercontent.com/20847995/79219205-84e55580-7e5a-11ea-96e2-c39581b90e61.png)

This handler allows you to generate GraphQL schema based on a MySQL database schema or an SQL dump file.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/mysql
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: Employees
    handler:
      mysql:
        connectionString: path/to/database.sqlite
```

> You can check out our example that uses MySQL handler.
[Click here to open the example on GitHub](https://github.com/Urigo/graphql-mesh/tree/master/examples/mysql-employees)

## Config API Reference

{@import ../generated-markdown/MySQLHandler.generated.md}
