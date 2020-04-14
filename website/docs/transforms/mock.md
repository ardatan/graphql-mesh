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

## Codesandbox Example

You can check out our example that uses JSON Schema handler with mock data.

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/json-schema-example?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="json-schema-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>

## Config API Reference

{@import ../generated-markdown/MockingConfig.generated.md}
