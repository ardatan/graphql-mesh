---
id: tuql
title: Tuql
sidebar_label: Tuql
---

This handler allows you to use GraphQL schema created by [Tuql](https://github.com/bradleyboy/tuql), based on a SQLite database schema or an SQL dump file.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/tuql
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: MyDb
    handler:
      tuql:
        db: path/to/database.sqlite
```

And also you can create an in-memory database using an SQL dump file;

```yml
sources:
  - name: MyDb
    handler:
      tuql:
        infile: path/to/db_dump.sql
```

## Config API Reference

{@import ../generated-markdown/TuqlHandler.generated.md}
