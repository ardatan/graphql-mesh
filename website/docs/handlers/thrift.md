---
id: thrift
title: Apache Thrift
sidebar_label: Apache Thrift
---
![image](https://user-images.githubusercontent.com/20847995/79219986-e4903080-7e5b-11ea-8220-e69ae73e7966.png)

This handler allows you to consume [Apache Thrift](https://thrift.apache.org) `.thrift` files and generate a remote executable schema for those services.

To get started, install the handler library from NPM:

```sh
yarn add @graphql-mesh/thrift
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
    - name: Calculator
      handler:
        thrift:
          idl: ./src/thrift/calculator.thrift
          hostName: localhost
          port: 8080
          path: /thrift
          serviceName: calculator-service
```

> You can check out our example that uses Thrift Handler.

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/thrift-example?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="thrift-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin" />


## Config API Reference

{@import ../generated-markdown/ThriftHandler.generated.md}
