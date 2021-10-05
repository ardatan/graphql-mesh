---
id: installation
title: Installation
sidebar_label: Installation
---

GraphQL Mesh comes in multiple packages, which you should install according to your needs.

To get started with the basics, install the following:

```
yarn add graphql @graphql-mesh/cli
```

Then, you need to install a Mesh handler, according to your API needs. You can see the list of [all available built-in handlers in here](/docs/handlers/handlers-introduction).

For example, if you wish to use OpenAPI handler, install the handler that matches you needs:

```
yarn add graphql @graphql-mesh/openapi
```

Then, this handler will be available for you to use in your config file.
