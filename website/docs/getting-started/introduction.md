---
id: introduction
title: Introduction
sidebar_label: 1. Introduction
image: https://miro.medium.com/max/1400/1*iZfQ7ST9rd7McrHvvVA-BA@2x.png
---

<img
  width="50%"
  alt="GraphQL Mesh"
  src="/img/mesh-text-logo.svg"
/>;

GraphQL Mesh allows you to use GraphQL query language to access data in remote APIs that don't run GraphQL (and also ones that do run GraphQL). It can be used as a gateway to other services, or run as a local GraphQL schema that aggregates data from remote APIs.

The goal of GraphQL Mesh is to simplify access to your data-sources, and use GraphQL language to query it easily. You can link, merge, aggregate, transform, modify and link your data-sources, and later query it using GraphQL queries.

You can use one of the handlers that we wrote (GraphQL, Apollo Federation, gRPC, Swagger, OpenAPI, SOAP, Postgres and more), or write your own handler to access your data.

![GraphQL Mesh](/img/mesh-example.png)

> Note: GraphQL Mesh doesn’t aim to magically create your utopic public GraphQL schema - it’s just an easy-to-use proxy to your data, and you should consider implementing another layer that exposes your public data the way you need it to be.

### How it works?

The way GraphQL Mesh works is:

1. Collect API schema specifications from services
2. Create a runtime instance of fully-typed SDK for the services.
3. Convert API specs to GraphQL schema
4. Applies custom schema transformations and schema extensions
5. Creates fully-typed, single schema, GraphQL SDK to fetch data from your services.
