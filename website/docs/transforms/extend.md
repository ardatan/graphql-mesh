---
id: extend
title: Extend Transform
sidebar_label: Extend
---

The `extend` transform allow you to add custom GraphQL using SDL syntax. You can use this to add new custom types, extend existing types and link between types. 

```
yarn add @graphql-mesh/transform-extend
```

## How to use?

Add the following configuration to your Mesh config file:

```yml
transforms:
  - extend: | 
    extend type Query {
      myNewField: String!
    }
```

## Codesandbox Example

You can check Location Weather example that uses OpenAPI handler with extend transform and additional resolvers;

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/location-weather?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="typescript-location-weather-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>
