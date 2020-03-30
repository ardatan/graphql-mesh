---
id: mock
title: Mock Transform
sidebar_label: Mock
---

The `mock` transform allow you to apply mocking for development usage.

To get started with this transform, install it from npm:

```
yarn add @graphql-mesh/transform-mock
```

## How to use?

Add the following configuration to your Mesh config file:

```yml
transforms:
  - mock:
      mocks:
        - apply: User.firstName
          faker: '{{name.firstName}}'
```

The example above will replace the resolver of `User.firstName` with a mock that uses `faker.js` to generate a random name.

## Config API Reference

{@import ../generated-markdown/MockingConfig.generated.md}
