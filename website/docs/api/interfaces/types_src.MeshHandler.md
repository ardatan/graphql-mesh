---
title: 'MeshHandler'
---

# Interface: MeshHandler<TContext\>

[types/src](../modules/types_src).MeshHandler

## Type parameters

| Name | Type |
| :------ | :------ |
| `TContext` | `any` |

## Implemented by

- [`GraphQLHandler`](/docs/api/classes/handlers_graphql_src.GraphQLHandler)
- [`GrpcHandler`](/docs/api/classes/handlers_grpc_src.GrpcHandler)
- [`JsonSchemaHandler`](/docs/api/classes/handlers_json_schema_src.JsonSchemaHandler)
- [`MongooseHandler`](/docs/api/classes/handlers_mongoose_src.MongooseHandler)
- [`MySQLHandler`](/docs/api/classes/handlers_mysql_src.MySQLHandler)
- [`Neo4JHandler`](/docs/api/classes/handlers_neo4j_src.Neo4JHandler)
- [`ODataHandler`](/docs/api/classes/handlers_odata_src.ODataHandler)
- [`OpenAPIHandler`](/docs/api/classes/handlers_openapi_src.OpenAPIHandler)
- [`PostGraphileHandler`](/docs/api/classes/handlers_postgraphile_src.PostGraphileHandler)
- [`SoapHandler`](/docs/api/classes/handlers_soap_src.SoapHandler)
- [`ThriftHandler`](/docs/api/classes/handlers_thrift_src.ThriftHandler)
- [`TuqlHandler`](/docs/api/classes/handlers_tuql_src.TuqlHandler)

## Table of contents

### Methods

- [getMeshSource](types_src.MeshHandler#getmeshsource)

## Methods

### getMeshSource

▸ **getMeshSource**(): `Promise`<[`MeshSource`](../modules/types_src#meshsource)<`TContext`, `any`\>\>

#### Returns

`Promise`<[`MeshSource`](../modules/types_src#meshsource)<`TContext`, `any`\>\>

#### Defined in

[packages/types/src/index.ts:35](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L35)
