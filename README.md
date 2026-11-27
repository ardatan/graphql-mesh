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
  <h6>Federate any API into a GraphQL Supergraph</h6>
  <a href="https://the-guild.dev/graphql/mesh/v2"><b>Go to documentation</b></a>
  ·
  <a href="https://specs.graphql-mesh.dev"><b>Mesh specs</b></a>
</div>

<br />

<div align="center">

[![npm version](https://badge.fury.io/js/%40graphql-mesh%2Fcli.svg)](https://badge.fury.io/js/%40graphql-mesh%2Fcli)
![CI](https://github.com/ardatan/graphql-mesh/workflows/test/badge.svg)
[![Discord Chat](https://img.shields.io/discord/625400653321076807)](https://discord.gg/xud7bH9)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

</div>

GraphQL Mesh helps you **Federate any API into a GraphQL Supergraph**.

Build Federation-ready Mesh subgraph SDL from GraphQL and non-GraphQL sources — **Generate**,
**Hand-write**, or **Generate-then-edit** — then compose and serve on any Federation-compatible
gateway. Mesh is **platform / registry / gateway independent**: keep Hive, Apollo GraphOS, Rover, or
any other Federation stack; Mesh extends the graph you already run.

- Build Federated GraphQL subgraphs from any API (**REST**, **SOAP**, **OData**, **gRPC**, **SQL**,
  and more)
- Support any GraphQL Platform incl. **Hive** and **Apollo GraphOS**
- Run with any Federation Gateway and Router (**Hive Gateway**, **Apollo Router**, and peers)

## How does it work?

1. **Generate** (or hand-write) Federation-ready Mesh subgraph SDL from your sources
2. Optionally **Transform** the subgraph (automatic Compose transforms or edit the `.graphql`)
3. **Serve Subgraph** when another gateway needs a Mesh-backed Federation URL
4. **Compose** subgraphs into a supergraph (Mesh Compose, Hive, Rover, or your registry)
5. **Serve Supergraph** on the Federation gateway you already run

Same contract whether you Generate or Hand-write: Mesh directives and HTTP/REST Connectors
(`@connect` / `@source`) stamped in GraphQL SDL. Spec imports live under
[specs.graphql-mesh.dev](https://specs.graphql-mesh.dev).

[Mesh v2 docs](https://the-guild.dev/graphql/mesh/v2) ·
[Generate](https://the-guild.dev/graphql/mesh/v2/paths/generate) ·
[Hand-write](https://the-guild.dev/graphql/mesh/v2/paths/hand-write) ·
[Protocols](https://the-guild.dev/graphql/mesh/v2/protocols) ·
[Mesh specs](https://specs.graphql-mesh.dev)

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
