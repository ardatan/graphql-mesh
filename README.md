[![Mesh GIF](./website/public/static/img/twitter_1200X345.gif)](https://graphql-mesh.com)

[![npm version](https://badge.fury.io/js/%40graphql-mesh%2Fcli.svg)](https://badge.fury.io/js/%40graphql-mesh%2Fcli)
![CI](https://github.com/Urigo/graphql-mesh/workflows/CI/badge.svg)
[![Discord Chat](https://img.shields.io/discord/625400653321076807)](https://discord.gg/xud7bH9)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

https://www.graphql-mesh.com

GraphQL Mesh allows you to use GraphQL query language to access data in remote APIs that don't run GraphQL (and also ones that do run GraphQL).
It can be used as a gateway to other services or run as a local GraphQL schema that aggregates data from remote APIs.

The goal of GraphQL Mesh is to let developers easily access services that are written in other APIs specs (such as gRPC, OpenAPI/Swagger, OData, SOAP/WSDL, Apache Thrift, Mongoose, PostgreSQL, Neo4j, and also GraphQL) with GraphQL queries and mutations.

GraphQL Mesh gives the developer the ability to modify the output schemas, link types across schemas and merge schema types. You can even add custom GraphQL types and resolvers that fit your needs.

It allows developers to control the way they fetch data, and overcome issues related to backend implementation, legacy API services, chosen schema specification and non-typed APIs.

GraphQL Mesh is acting as a proxy to your data, and uses common libraries to wrap your existing API services. You can use this proxy locally in your service or application by running the GraphQL schema locally (with GraphQL `execute`), or you can deploy this as a gateway layer to your internal service.

## How does it work?

The way GraphQL Mesh works is:

1. Collect API schema specifications from services
2. Create a runtime instance of fully-typed SDK for the services.
3. Convert API specs to GraphQL schema
4. Applies custom schema transformations and schema extensions
5. Creates fully-typed, single schema, GraphQL SDK to fetch data from your services.

## Getting Started

<details>
<summary><strong>Installation</strong></summary>
<p>

GraphQL Mesh comes in multiple packages, which you should install according to your needs.

To get started with the basics, install the following:

```
$ yarn add graphql @graphql-mesh/runtime @graphql-mesh/cli
```

Then, you need to install a Mesh handler, according to your API needs. You can see the list of all available built-in handlers in this README, under the `Supported APIs` section.

For example, if you wish to use OpenAPI handler, install the handler that matches your needs:

```
$ yarn add graphql @graphql-mesh/openapi
```

Then, this handler will be available for you to use in your config file.

</p>
</details>

[Getting started](https://www.graphql-mesh.com/docs/introduction)

[Supported Source APIs](https://www.graphql-mesh.com/docs/handlers/handlers-introduction)

[Schema Transformations](https://graphql-mesh.com/docs/transforms/transforms-introduction)

## Contributions

Contributions, issues and feature requests are very welcome. If you are using this package and fixed a bug for yourself, please consider submitting a PR!

And if this is your first time contributing to this project, please do read our [Contributor Workflow Guide](https://github.com/the-guild-org/Stack/blob/master/CONTRIBUTING.md) before you get started off.

### Code of Conduct

Help us keep GraphQL Mesh open and inclusive. Please read and follow our [Code of Conduct](https://github.com/the-guild-org/Stack/blob/master/CODE_OF_CONDUCT.md) as adopted from [Contributor Covenant](https://www.contributor-covenant.org/)

### License

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?maxAge=2592000)](https://raw.githubusercontent.com/apollostack/apollo-ios/master/LICENSE)

MIT
