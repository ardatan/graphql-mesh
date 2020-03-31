---
id: odata
title: OData
sidebar_label: OData
---

This handler allows you to load remote OData schemas.

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
        baseUrl: https://services.odata.org/
        services:
          - servicePath: TripPinRESTierService/
```

## Config API Reference

{@import ../generated-markdown/GraphQLHandler.generated.md}
