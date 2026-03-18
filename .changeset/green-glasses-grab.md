---
'@graphql-mesh/cli': patch
---

Fix: Added a .catch() to the initial meshInstance$ assignment in the getBuiltMesh code generation
template (packages/legacy/cli/src/commands/ts-artifacts.ts) that resets meshInstance$ to undefined
on failure, allowing the next call to retry.
