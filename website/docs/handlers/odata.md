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

> You can check out our TripPin example that uses OData handler.
[Click here to open the example on CodeSandbox](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/odata-trippin)

## Config API Reference

{@import ../generated-markdown/ODataHandler.generated.md}
