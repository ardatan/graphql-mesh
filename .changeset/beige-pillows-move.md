---
'@graphql-mesh/plugin-prometheus': minor
---

Adds a cache for metrics definition (Summary, Histogram and Counter).

Fixes an issue preventing this plugin to be initialized multiple times, leading to metrics
duplication error (https://github.com/ardatan/graphql-mesh/issues/6545).

## Behavior Breaking Change:

Due to Prometheus client API limitations, a metric is only defined once for a given registry. This
means that if the configuration of the metrics, it will be silently ignored on plugin
re-initialization.

This is to avoid potential loss of metrics data produced between the plugin re-initialization and
the last pull by the prometheus agent.

If you need to be sure metrics configuration is up to date after a plugin re-initialization, you can
either:

- restart the whole node process instead of just recreating a graphql server at runtime
- clear the registry using `registry.clear()` before plugin re-initialization:
  ```ts
  function usePrometheusWithReset() {
    registry.clear()
    return usePrometheus({ ... })
  }
  ```
- use a new registry for each plugin instance:
  ```ts
  function usePrometheusWithRegistry() {
    const registry = new Registry()
    return usePrometheus({
      registry,
      ...
    })
  }
  ```

Keep in mind that this implies potential data loss in pull mode.

## New configuration options

Each metrics can now be fully customized. You can use the new factories `createHistogram`,
`createCounter` and `createSummary` to provide your own configuration for each metrics.

**Example:**

```ts
import { usePrometheus, createHistogram, createCounter, createSummary } from '@graphql-mesh/plugin-prometheus'
import { Registry } from 'prom-client'

const registry = new Registry()

usePrometheus({
  registry,
  parse: createHistogram({
    registry: registry // make sure to add your custom registry, if you are not using the default one
    histogram: new Histogram({
      name: 'my_custom_name',
      help: 'HELP ME',
      labelNames: ['opText'] as const,
    }),
    fillLabelsFn: params => {
      // if you wish to fill your `labels` with metadata, you can use the params in order to get access to things like DocumentNode, operationName, operationType, `error` (for error metrics) and `info` (for resolvers metrics)
      return {
        opText: print(params.document)
      }
    }
  })
})
```
