---
id: odata
title: OData / Microsoft Graph
sidebar_label: OData / Microsoft Graph
---
![image](https://user-images.githubusercontent.com/20847995/79219762-87947a80-7e5b-11ea-903d-ba159935fa17.png)

This handler allows you to load remote [OData](https://odata.org) metadata/schema as GraphQL Schema.

To get started, install the handler library from NPM:

```sh
yarn add @graphql-mesh/odata
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: TripPin
    handler:
      odata:
        baseUrl: https://services.odata.org/TripPinRESTierService/
```
## Dynamic Header Values

Mesh can take dynamic values from the GraphQL Context or the environmental variables. If you use `mesh dev` or `mesh start`, GraphQL Context will be the incoming HTTP request.

The expression inside dynamic values should be as in JS.

### From Context (HTTP Header for `mesh dev` or `mesh start`)

```yml
sources:
  - name: MyGraphQLApi
    handler:
      odata:
        baseUrl: https://graph.microsoft.com/v1.0
        operationHeaders:
          # Please do not use capital letters while getting the headers
          Authorization: Bearer {context.headers['x-my-api-token']}
          # You can also access to the cookies like below;
          # Authorization: Bearer {context.cookies.myApiToken}
```

And for `mesh dev` or `mesh start`, you can pass the value using `x-my-graphql-api-token` HTTP header.

### From Environmental Variable

`MY_API_TOKEN` is the name of the environmental variable you have the value.

```yml
sources:
  - name: MyGraphQLApi
    handler:
      odata:
        baseUrl: https://graph.microsoft.com/v1.0
        operationHeaders:
          Authorization: Bearer {env.MY_API_TOKEN}
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
