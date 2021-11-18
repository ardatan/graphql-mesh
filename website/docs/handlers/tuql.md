---
id: tuql
title: SQLite / Tuql
sidebar_label: SQLite / Tuql
---
![image](https://user-images.githubusercontent.com/20847995/79220131-228d5480-7e5c-11ea-8faa-63083653573b.png)

This handler allows you to use GraphQL schema created by [Tuql](https://github.com/bradleyboy/tuql), based on a SQLite database schema or an SQL dump file.

To get started, install the handler library from NPM:

```sh
yarn add @graphql-mesh/tuql
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

## Codesandbox Example

You can check out our example that uses Tuql Handler.

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/sqlite-chinook?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="chinook-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>

## Config API Reference

{@import ../generated-markdown/TuqlHandler.generated.md}
