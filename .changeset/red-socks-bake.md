---
"@graphql-mesh/fusion-execution": patch
---

Skip the resolver if it has required variables that the parent subgraph doesn't have

```graphql
type Foo
  # There is only Foo_A_id, but no Foo_B_id or Foo_C_id
  @variable(name: "Foo_A_id", select: "id", subgraph: "A")
  # This resolver should be skipped
  @resolver(operation: "query FooFromB($Foo_B_id: ID!) { foo(id: $Foo_B_id) }", subgraph: "B")
  # This resolver should be used
  @resolver(operation: "query FooFromB($Foo_A_id: ID!) { foo(id: $Foo_A_id) }", subgraph: "B")
  # This resolver should be skipped
  @resolver(operation: "query FooFromC($Foo_C_id: ID!) { foo(id: $Foo_C_id) }", subgraph: "C")
  # This resolver should be used
  @resolver(operation: "query FooFromC($Foo_A_id: ID!) { foo(id: $Foo_A_id) }", subgraph: "C") {
  id: ID! @source(subgraph: "A")
  bar: String! @source(subgraph: "B")
  baz: String! @source(subgraph: "C")
}
```
