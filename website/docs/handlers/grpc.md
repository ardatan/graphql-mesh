---
id: grpc
title: gRPC
sidebar_label: gRPC
---

This handler allows you to load gRPC definition files (`.proto`).

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

## Config API Reference

{@import ../generated-markdown/GrpcHandler.generated.md}

