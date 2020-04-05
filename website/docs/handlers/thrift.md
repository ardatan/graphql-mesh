---
id: thrift
title: Thrift
sidebar_label: SOAP
---

This handler allows you to consume [Apache Thrift](https://thrift.apache.org/) `.thrift` files and generate an executable schema for those services.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/thrift
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

## Config API Reference

{@import ../generated-markdown/ThriftHandler.generated.md}
