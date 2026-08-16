---
"@graphql-mesh/fusion-composition": patch
---

Preserve interface implementors and union members when encapsulating a subgraph, keep original field directives on wrapped fields, and nest a second encapsulate (same outer name across subgraphs) without dropping inner namespaces.
