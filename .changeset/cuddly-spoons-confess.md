---
'@graphql-mesh/grpc': minor
'grpc-example': minor
---

Change the generation rules of GraphQL type names to allow nested messages with name "Input"

**BREAKING CHANGE:**
  Nested messages (messages in packages or nested) type names are
  now seperated by `__` instead of `_`.

  Example for message `google.protobuf.Timestamp`:
  `google_protobuf_Timestamp` => `google__protobuf__Timestamp`
