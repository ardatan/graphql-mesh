---
id: mysql
title: MySQL
sidebar_label: MySQL
---
![image](https://user-images.githubusercontent.com/20847995/79219205-84e55580-7e5a-11ea-96e2-c39581b90e61.png)

This handler allows you to generate GraphQL schema from an existing MySQL database.

To get started, install the handler library from NPM:

```sh
yarn add @graphql-mesh/mysql
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
```

### How does `where` work?

Every CRUD operation has `where` field in their input, so you can see all the columns of a table. `where` works like below;
```graphql
{
  getProduct(where: {
    id: 5,
    year: '>2010',
    price: '100..200',
    level: '<=3',
    sn: '\*str?',
    label: 'str',
    code: '(1,2,4,10,11)'
  }) {
    id
    name
  }
}
```

This GraphQL operation will send the following query to your MySQL database;
```sql
SELECT id, name FROM product WHERE id = 5 AND year > '2010' AND (price BETWEEN '100' AND '200') AND level <= '3' AND sn LIKE '%str\_' AND label = 'str' AND code IN (1,2,4,10,11)
```

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/mysql-rfam?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="mysql-rfam-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>

## Config API Reference

{@import ../generated-markdown/MySQLHandler.generated.md}
