---
id: grpc
title: gRPC & Protobuf
sidebar_label: gRPC
---
![image](https://user-images.githubusercontent.com/20847995/79218793-b27dcf00-7e59-11ea-8f0f-df97503f5494.png)

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

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/grpc-example?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="grpc-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin" />

## Config API Reference

{@import ../generated-markdown/GrpcHandler.generated.md}

