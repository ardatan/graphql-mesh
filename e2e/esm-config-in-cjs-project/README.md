# ESM config in CJS project

This example demonstrate that it is possible to use a TS (or ESM) config inside a CJS project.

It composes a dummy schema, which is not meant to actually be executable.

## Compose

The schema is composable using the `mesh-compose` CLI as usual:

```bash
$ yarn mesh-compose
```

## Serve

The generated supegraph can then be serve by the Hive Gateway:

```bash
$ yarn hive-gateway supergraph
```
