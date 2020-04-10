---
id: grpc
title: gRPC & Protobuf
sidebar_label: gRPC
---

This handler allows you to load [gRPC](https://grpc.io/) definition files (`.proto`).

```
$ yarn add @graphql-mesh/grpc
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: MyGrpcApi
    handler:
      grpc:
        endpoint: localhost:50051
        protoFilePath: grpc/proto/Example.proto
        serviceName: Example
        packageName: io.xtech.example
```

> You can check out our example that uses gRPC Handler.
[Click here to open the example on GitHub](https://github.com/Urigo/graphql-mesh/tree/master/examples/grpc-example)

## Config API Reference

{@import ../generated-markdown/GrpcHandler.generated.md}

