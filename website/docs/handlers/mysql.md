---
id: mysql
title: MySQL
sidebar_label: MySQL
---
![image](https://user-images.githubusercontent.com/20847995/79219205-84e55580-7e5a-11ea-96e2-c39581b90e61.png)

This handler allows you to generate GraphQL schema using `graphql-compose-mysql` based on a MySQL database schema or an SQL dump file.

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
        host: localhost
        port: 3306
        user: root
        password: passwd
        database: employees
        tables: departements,title
```

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/mysql-rfam?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="mysql-rfam-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>

## Config API Reference

{@import ../generated-markdown/MySQLHandler.generated.md}
