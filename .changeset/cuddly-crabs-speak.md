---
'@graphql-mesh/plugin-newrelic': minor
---

Now `args` and `key` are not sent by default. You should enable `includeResolverArgs` to send them to NewRelic and also `includeRawResult` allows you to send delegation result to NewRelic
