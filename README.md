[![Mesh GIF](./website/public/static/img/twitter_1200X345.gif)](https://graphql-mesh.com)

<!-- Graphql logo readme banner START -->
<p style="float: right; margin: 0 0 10px 10px;">
  <a href="https://the-guild.dev" align="right">
    <img align="right" src="https://the-guild-org.github.io/press-kit/full-dark-logo.svg" alt="Created by The guild" style="width: 100px;"/>
  </a>
</p>
<!-- Graphql logo readme banner END -->

<div align="center">
  &nbsp;<h3>GraphQL Mesh</h3>
  <h6>GraphQL Federation framework for any API</h6>
  <a href="https://www.graphql-mesh.com/v1"><b>Go to documentation</b></a>
</div>

<br />

<div align="center">

[![npm version](https://badge.fury.io/js/%40graphql-mesh%2Fcli.svg)](https://badge.fury.io/js/%40graphql-mesh%2Fcli)
![CI](https://github.com/ardatan/graphql-mesh/workflows/test/badge.svg)
[![Discord Chat](https://img.shields.io/discord/625400653321076807)](https://discord.gg/xud7bH9)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

</div>

GraphQL Mesh is a GraphQL Federation framework and gateway for both GraphQL Federation and
non-GraphQL Federation subgraphs, non-GraphQL services, such as REST and gRPC, and also databases
such as MongoDB, MySQL, and PostgreSQL.

GraphQL Mesh allows you to use GraphQL query language to access data in remote APIs that don't run
GraphQL (and also ones that do run GraphQL). It can be used as a gateway to other services or run as
a local GraphQL schema that aggregates data from remote APIs.

The goal of GraphQL Mesh is to let developers easily access services that are written in other APIs
specs (such as gRPC, OpenAPI/Swagger, OData, SOAP/WSDL, Apache Thrift, Mongoose, PostgreSQL, Neo4j,
and also GraphQL) with GraphQL queries and mutations.

GraphQL Mesh gives the developer the ability to modify the output schemas, link types across schemas
and merge schema types. You can even add custom GraphQL types and resolvers that fit your needs.

It allows developers to control the way they fetch data, and overcome issues related to backend
implementation, legacy API services, chosen schema specification and non-typed APIs.

GraphQL Mesh is acting as a proxy to your data, and uses common libraries to wrap your existing API
services. You can use this proxy locally in your service or application by running the GraphQL
schema locally (with GraphQL execute), or you can deploy this as a gateway layer to your internal
service.

## How does it work?

The way GraphQL Mesh works is:

1. Collect API schema specifications from services
2. Create a runtime instance of fully-typed SDK for the services.
3. Convert API specs to GraphQL schema
4. Applies custom schema transformations and schema extensions
5. Creates a Federation subgraph or a Federation-compatible supergraph

[Getting started](https://the-guild.dev/graphql/mesh/v1/getting-started)

[Supported Source APIs](https://the-guild.dev/graphql/mesh/v1/source-handlers)

[Schema Transformations](https://the-guild.dev/graphql/mesh/v1/transforms)

## Contributions

Contributions, issues and feature requests are very welcome. If you are using this package and fixed
a bug for yourself, please consider submitting a PR!

And if this is your first time contributing to this project, please do read our
[Contributor Workflow Guide](https://github.com/the-guild-org/Stack/blob/master/CONTRIBUTING.md)
before you get started off.

### Code of Conduct

Help us keep GraphQL Mesh open and inclusive. Please read and follow our
[Code of Conduct](https://github.com/the-guild-org/Stack/blob/master/CODE_OF_CONDUCT.md) as adopted
from [Contributor Covenant](https://www.contributor-covenant.org/)

### License

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?maxAge=2592000)](https://raw.githubusercontent.com/apollostack/apollo-ios/master/LICENSE)

MIT
