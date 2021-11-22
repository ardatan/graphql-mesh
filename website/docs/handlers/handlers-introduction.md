---
id: handlers-introduction
title: Source Handlers
sidebar_label: Introduction
---

GraphQL Mesh can consume different data source types inside GraphQL.

```yml
sources:
    - name: Name Of My Source
      handler:
        handlerName:
            # ...handlerConfig can be found inside the dedicated documentation
```

| NPM Package                  | Status    | Supported Spec                                                                                                                                                                             | Docs                                |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `@graphql-mesh/graphql`      | Available | [GraphQL](https://graphql.org) endpoint                                                                                                                                                    | [docs](/docs/handlers/graphql)      |
| `@graphql-mesh/openapi`      | Available | [Swagger, OpenAPI 2/3](https://swagger.io) (based on `openapi-to-graphql`)                                                                                                                 | [docs](/docs/handlers/openapi)      |
| `@graphql-mesh/json-schema`  | Available | [JSON Schema](https://json-schema.org) or samples                                                                                                                                          | [docs](/docs/handlers/json-schema)  |
| `@graphql-mesh/postgraphile` | Available | [PostgreSQL](https://postgresql.org) Database                                                                                                                                              | [docs](/docs/handlers/postgraphile) |
| `@graphql-mesh/grpc`         | Available | [gRPC](https://grpc.io) and [Protobuf](https://en.wikipedia.org/wiki/Protocol_Buffers) schemas                                                                                             | [docs](/docs/handlers/grpc)         |
| `@graphql-mesh/soap`         | Available | [SOAP](https://en.wikipedia.org/wiki/SOAP) specification                                                                                                                                   | [docs](/docs/handlers/soap)         |
| `@graphql-mesh/mongoose`     | Available | [MongoDB](https://mongodb.com) database with [Mongoose](https://mongoosejs.com) schemas based on [`graphql-compose-mongoose`](https://github.com/graphql-compose/graphql-compose-mongoose) | [docs](/docs/handlers/mongoose)     |
| `@graphql-mesh/odata`        | Available | [OData](https://odata.org) specification                                                                                                                                                   | [docs](/docs/handlers/odata)        |
| `@graphql-mesh/thrift`       | Available | [Apache Thrift](https://thrift.apache.org)                                                                                                                                                 | [docs](/docs/handlers/thrift)       |
| `@graphql-mesh/tuql`         | Available | [SQLite](https://sqlite.org/index.html) Database                                                                                                                                           | [docs](/docs/handlers/tuql)         |
| `@graphql-mesh/mysql`        | Available | [MySQL](https://mysql.com) Database                                                                                                                                                        | [docs](/docs/handlers/mysql)        |
| `@graphql-mesh/neo4j`        | Available | [Neo4j](https://neo4j.com) based on [neo4j-graphql-js](https://github.com/neo4j-graphql/neo4j-graphql-js)                                                                                  | [docs](/docs/handlers/neo4j)        |
