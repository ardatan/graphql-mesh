---
'@graphql-mesh/fusion-composition': patch
---

Hide types that become unreachable when `createFilterTransform` filters their last accessible field

The filter transform keeps filtered fields in the executable subgraph schema and marks them with `@inaccessible`. This is necessary because their definitions can still carry execution metadata, but it also means that a later prune transform considers their referenced types reachable. Those types were consequently left in the public API schema, including generated unions whose operations had all been filtered.

The transform now compares schema reachability before and after applying its filters. Types that were reachable before filtering but are unreachable afterward are marked with `@inaccessible`, allowing composition to omit them from the public API while retaining them in the supergraph for execution. Types that were already unreachable before filtering and root operation types are preserved to avoid changing existing filtering behavior. Enum types are also preserved because federation validates enum values used in argument defaults before removing inaccessible fields from the API schema.
