---
'@graphql-mesh/supergraph': patch
---

Fix the support for WebSockets configuration for supergraph handler

For example;
```yaml filename="mesh.config.yaml"
sources:
  - name: MySupergraph
    handler:
      supergraph:
        source: # ...
        subgraphs:
          - name: MySubgraph
            subscriptionsEndpoint: ws://localhost:4000/graphql
            subscriptionsProtocol: WS
```
