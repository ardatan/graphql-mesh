---
id: introduction
title: Introduction
sidebar_label: Introduction
image: https://miro.medium.com/max/1400/1*iZfQ7ST9rd7McrHvvVA-BA@2x.png
---

GraphQL Mesh allows you to use GraphQL query language to access data in remote APIs that don't run GraphQL (and also ones that do run GraphQL). It can be used as a gateway to other services, or run as a local GraphQL schema that aggregates data from remote APIs.

The goal of GraphQL Mesh is to simplify access to your data-sources, and use GraphQL language to query it easily. You can link, merge, aggregate, transform, modify and link your data-sources, and later query it using GraphQL queries.

You can use one of the handlers that we wrote (GraphQL, gRPC, Swagger, OpenAPI, SOAP, Postgres and more), or write your own handler to access your data.

### How it works?

1. Collect API schema specifications from services
2. Create a runtime instance of fully-typed SDK for the services.
3. Convert API specs to GraphQL schema
4. Applies custom schema transformations and schema extensions
5. Creates fully-typed, single schema and GraphQL SDK to fetch data from your services.

### How it can be used?

- [As an SDK](/docs/recipes/as-sdk)
- [As a Gateway](/docs/recipes/as-gateway)

<img
  width="60%"
  style={{ margin: '0 auto' }}
  alt="GraphQL Mesh"
  src="/static/img/mesh-example.png"
/>
