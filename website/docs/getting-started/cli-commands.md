---
id: cli-commands
title: CLI commands
sidebar_label: CLI commands
---


## Installation

If you have installed the CLI globally, you can use `mesh` directly from anywhere in the terminal.
However, please be aware that Global installed CLI versus local CLI does not return the same results in all circumstances.

We recommend installing GraphQL Mesh locally, allowing you to run it as follow:

```bash
yarn mesh
```

If you are using npm, you will need to add it to your `package.json` `scripts` as follow:

```json
{
  "scripts": {
    "mesh": "mesh",
  }
}
```

which will allow you to use it as follows:

```bash
npm run mesh -- # options...
```



<p>
&nbsp;
</p>

## Global Options

All commands can take two global optional options.

<p>
&nbsp;
</p>

###  `--r (alias: require)  [array]`

Loads specific require.extensions before running the codegen and reading the configuration.


```bash
yarn graphql-mesh --r lodash
yarn graphql-mesh --require lodash fluke2
```

<p>
&nbsp;
</p>

### `--dir  [string]`

Used to modify the base directory for looking for a `.meshrc` config file.

```
yarn graphql-mesh --dir ./mystuff/meshproject
```

<p>
&nbsp;
</p>


## List of Commands

### `mesh dev`

Serves a GraphQL server with a GraphQL interface to test your Mesh API locally.

Can have an optional `--port` argument.

> GraphQL Mesh does not currently support hot reloading.


**Options**

**`--port [number]`**

The system port on which graphql-mesh will be made available.

This should be one of the normal system ports [1-65386] not currently used by any other service.


```bash
yarn graphql-mesh dev --port 4002
```

<p>
&nbsp;
</p>



### `mesh build`

Builds artifacts required to use `mesh start` for a gateway (production) server.

More information about this on the [Build Artifacts](/docs/recipes/build-mesh-artifacts) page.

<p>
&nbsp;
</p>


### `mesh validate`

Validate the built artifacts (`mesh build`) required to use `mesh start` for a gateway (production) server.
The validation will check the following:
- presence of the `.mesh/` folder
- validation of the mesh configuration (see [`packages/types/src/config-schema.json`](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config-schema.json))
- configured sources are valid

More information about this on the [Build Artifacts](/docs/recipes/build-mesh-artifacts) page.

<p>
&nbsp;
</p>

### `mesh start`

Serves a GraphQL server using the built artifacts.
`mesh start` compared to `mesh dev` does not rely on the sources to build the schema.
Instead, it uses the built artifacts.
Therefore, `mesh start` is recommended to start a mesh server in production.

More information about `mesh start` on the [Build Artifacts](/docs/recipes/build-mesh-artifacts) page.

Can have an optional `--port` argument.

**Options**

**`--port [number]`**

The system port on which graphql-mesh will be made available.

This should be one of the normal system ports [1-65386] not currently used by any other service.


```bash
yarn graphql-mesh start --port 4002
```

<p>
&nbsp;
</p>

### `mesh serve-source`

`serve-source` helps with quickly assessing that Mesh properly ingests a source.
Given a source name as the only argument, Mesh will serve a GraphQL API only exposing the given source.

This command is handy to debug a source.

**Example**

Given the following configuration:

```yaml
sources:
  - name: Cities
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/mashape.com/geodb/1.0.0/swagger.json
    transforms:
      - rename:
          - from:
              type: Error
            to:
              type: CitiesError

  - name: Weather
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/weatherbit.io/2.0.0/swagger.json
    transforms:
      - rename:
          - from:
              type: Error
            to:
              type: WeatherError
```

You can test that the "Weather" source is properly ingested by mesh by running:

```bash
yarn graphql-mesh serve-source Weather
```

Then, Mesh will serve a GraphQL API only exposing the "Weather" source.

<p>
&nbsp;
</p>
