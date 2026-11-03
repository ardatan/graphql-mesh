---
"@graphql-mesh/plugin-newrelic": major
---

- Require Node.js `>=22.18.0`
- Align envelop/Yoga 6 majors
- Keep optional `options.log` for init-time diagnostics when the New Relic agent is unavailable (e.g. `options.log?.debug('Agent unavailable…')`); prefer Yoga `context.log` for request-time logging
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
#### Example
```ts
useMeshNewrelic({
  ...meshPluginOptions,
  log: meshLogger, // optional init-time logger when the New Relic agent is missing
})
```
