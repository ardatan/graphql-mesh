---
title: 'Handler'
---

# Interface: Handler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).Handler

Point to the handler you wish to use, it can either be a predefined handler, or a custom

## Indexable

▪ [k: `string`]: `any`

## Table of contents

### Properties

- [graphql](types_src.YamlConfig.Handler#graphql)
- [grpc](types_src.YamlConfig.Handler#grpc)
- [jsonSchema](types_src.YamlConfig.Handler#jsonschema)
- [mongoose](types_src.YamlConfig.Handler#mongoose)
- [mysql](types_src.YamlConfig.Handler#mysql)
- [neo4j](types_src.YamlConfig.Handler#neo4j)
- [newOpenapi](types_src.YamlConfig.Handler#newopenapi)
- [odata](types_src.YamlConfig.Handler#odata)
- [openapi](types_src.YamlConfig.Handler#openapi)
- [postgraphile](types_src.YamlConfig.Handler#postgraphile)
- [raml](types_src.YamlConfig.Handler#raml)
- [soap](types_src.YamlConfig.Handler#soap)
- [thrift](types_src.YamlConfig.Handler#thrift)
- [tuql](types_src.YamlConfig.Handler#tuql)

## Properties

### graphql

• `Optional` **graphql**: [`GraphQLHandlerHTTPConfiguration`](types_src.YamlConfig.GraphQLHandlerHTTPConfiguration) \| [`GraphQLHandlerCodeFirstConfiguration`](types_src.YamlConfig.GraphQLHandlerCodeFirstConfiguration) \| [`GraphQLHandlerMultipleHTTPConfiguration`](types_src.YamlConfig.GraphQLHandlerMultipleHTTPConfiguration)

Handler for remote/local/third-party GraphQL schema (Any of: GraphQLHandlerHTTPConfiguration, GraphQLHandlerCodeFirstConfiguration, GraphQLHandlerMultipleHTTPConfiguration)

#### Defined in

[packages/types/src/config.ts:206](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L206)

___

### grpc

• `Optional` **grpc**: [`GrpcHandler`](types_src.YamlConfig.GrpcHandler)

#### Defined in

[packages/types/src/config.ts:210](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L210)

___

### jsonSchema

• `Optional` **jsonSchema**: [`JsonSchemaHandler`](types_src.YamlConfig.JsonSchemaHandler)

#### Defined in

[packages/types/src/config.ts:211](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L211)

___

### mongoose

• `Optional` **mongoose**: [`MongooseHandler`](types_src.YamlConfig.MongooseHandler)

#### Defined in

[packages/types/src/config.ts:212](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L212)

___

### mysql

• `Optional` **mysql**: [`MySQLHandler`](types_src.YamlConfig.MySQLHandler)

#### Defined in

[packages/types/src/config.ts:213](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L213)

___

### neo4j

• `Optional` **neo4j**: [`Neo4JHandler`](types_src.YamlConfig.Neo4JHandler)

#### Defined in

[packages/types/src/config.ts:214](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L214)

___

### newOpenapi

• `Optional` **newOpenapi**: [`NewOpenapiHandler`](types_src.YamlConfig.NewOpenapiHandler)

#### Defined in

[packages/types/src/config.ts:215](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L215)

___

### odata

• `Optional` **odata**: [`ODataHandler`](types_src.YamlConfig.ODataHandler)

#### Defined in

[packages/types/src/config.ts:216](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L216)

___

### openapi

• `Optional` **openapi**: [`OpenapiHandler`](types_src.YamlConfig.OpenapiHandler)

#### Defined in

[packages/types/src/config.ts:217](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L217)

___

### postgraphile

• `Optional` **postgraphile**: [`PostGraphileHandler`](types_src.YamlConfig.PostGraphileHandler)

#### Defined in

[packages/types/src/config.ts:218](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L218)

___

### raml

• `Optional` **raml**: [`RAMLHandler`](types_src.YamlConfig.RAMLHandler)

#### Defined in

[packages/types/src/config.ts:219](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L219)

___

### soap

• `Optional` **soap**: [`SoapHandler`](types_src.YamlConfig.SoapHandler)

#### Defined in

[packages/types/src/config.ts:220](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L220)

___

### thrift

• `Optional` **thrift**: [`ThriftHandler`](types_src.YamlConfig.ThriftHandler)

#### Defined in

[packages/types/src/config.ts:221](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L221)

___

### tuql

• `Optional` **tuql**: [`TuqlHandler`](types_src.YamlConfig.TuqlHandler)

#### Defined in

[packages/types/src/config.ts:222](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L222)
