---
id: odata
title: OData / Microsoft Graph
sidebar_label: OData / Microsoft Graph
---

This handler allows you to load remote [OData](https://www.odata.org/) metadata/schema as GraphQL Schema.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/odata
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: TripPin
    handler:
      odata:
        baseUrl: https://services.odata.org/TripPinRESTierService/
```

## Codesandbox Example

You can check out our TripPin example that uses OData handler.

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/odata-trippin?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="odata-trippin-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>

## Config API Reference

{@import ../generated-markdown/ODataHandler.generated.md}
