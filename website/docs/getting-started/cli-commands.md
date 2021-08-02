## GraphQL-Mesh Commands

Graphql-mesh exposes a number of commands that can be used to determine interactions as well as startup behavior.

When running mesh commands please be aware that some will work differently based on the context you are executing them in. Global installed CLI vs local CLI do not return the exact same results in all circumstances.

Global installation:
```
yarn global add graphql @graphql-mesh/cli
```

If you have a global install of the cli and you can use `graphql-mesh` in terminal directly.

As indicated the result of the command may differ based on whether you run the global CLI command or the locally installed CLI inside your target project's root directory.
The safest method is to use the local CLI.

To run project specific commands CLI:

> windows     `node node_modules\\.bin\\graphql-mesh dump-schema --output ./schema.json`

> mac/linux   `node node_modules/.bin/graphql-mesh dump-schema --output ./schema.json`



To run a project specific commands repeatedly it is more practical to add a script reference inside your `package.json` like so:

```json
script: {
    "dump": "node_modules\\.bin\\graphql-mesh dump-schema --output ./schema.json",
```


## Global Options

All commands can take  two global options. Options are marked with a double dash `--` while commands themselves do not have a prefix.
Options are not required.

A simple type system is used in commands and option parameters. Here are the basic variable types used on command line:
- string : standard characters [A-z, 0-9]
- number : 0-9
- array  : elements are separated by space on command line.
- boolean: "true" | "false"

###  r (alias: require)  [array]

Loads specific require.extensions before running the codegen and reading the configuration.


#### Examples
```
yarn graphql-mesh --r lowdash
yarn graphql-mesh --require lowdash fluke2
```


### dir  [string]

Modified the base directory to use for looking for meshrc config file.

#### Examples
```
yarn graphql-mesh --dir ./mystuff/meshproject
```


## List of Commands

### serve

Serves a GraphQL server with GraphQL interface to test your Mesh API. Can have an optional port argument.

#### Options

##### port [number]

The system port on which graphql-mesh will be made available. This should be one of the normal system ports [1-65386] not currently used by any other service.


#### Example
```
yarn graphql-mesh serve --port 4002
```


### generate-sdk

Generates fully type-safe SDK based on unified GraphQL schema and GraphQL operations.

#### Options

##### output [string] - required

The target output file.

##### operations [array]

[need example]

##### depth [number]

The recursion depth of operations.

##### flatten-types [boolean]

Whether types should be flattened.

#### Example
```
yarn graphql-mesh generate-sdk --output ./myoutput.json
```
[TODO:verify]


### dump-schema

Generates a JSON introspection or GraphQL SDL schema file from your mesh. Output format will depend on your output file name extension.

#### Options

##### output [string] - required
The target file name, which should either have a `.json` or `.graphql` extension. Alternate supported file extension are: `graphqls`, `gql`, `gqls`.


#### Examples
```
yarn graphql-mesh dump-schema --output ./schema.json
or
yarn graphql-mesh dump-schema --output ./schema.graphql
```

### typescript

Generates TypeScript typings for the generated mesh.

#### Options

##### output [string] - required
The target file name, which should have a `.d.ts` extension.


#### Example
```
yarn graphql-mesh typescript --output ./myschema.d.ts
```


### write-introspection-cache

Writes introspection cache and creates it from scratch. The filename and directory are resolved from your `.meshrc.yaml` directives:

```yaml
introspectionCache: ./introspectionCache.json
```


#### Example
```
yarn graphql-mesh write-introspection-cache
```
