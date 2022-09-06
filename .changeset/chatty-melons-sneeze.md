---
'@graphql-mesh/cli': patch
'@graphql-mesh/types': patch
---

Fix TypeScript typings for additional scalars;

For example;

- `BigInt` should be `bigint`
- `PositiveInt` should be `int`
- `File` should be `File`
- `NonEmptyString` should be `string`
- `DateTime` should be `Date`
