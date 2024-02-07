# An Example Project for OpenWhisk

## Files

- `src/index.ts` is the handler function for the OpenWhisk action that uses GraphQL Mesh's platform
  agnostic HTTP Handler
- `.meshrc.yml` is the configuration file for GraphQL Mesh
- `package.json` is the package.json file that contains all the dependencies and scripts
- `build.js` is the code file that runs `ESBuild` to create a bundle for OpenWhisk deployment

## Configuring the project

GraphQL Mesh needs to be aware of the path of the OpenWhisk action endpoint. So you need to
configure `serve.endpoint` in `.meshrc.yml`;

```yaml filename=".meshrc.yaml"
serve:
  # This is the full path to your endpoint
  # In the following endpoint, we assume you have created a package with `wsk package create mesh`
  endpoint: /api/v1/web/guest/mesh/swapi/graphql
```

You also need to update the paths inside `index.ts` and `package.json` to match your OpenWhisk
action name.

## Building the project for deployment

You can see an example script to bundle the project with `ESBuild` in `build.js`. `yarn build` will
build the artifacts of GraphQL Mesh first then bundle all the code needed for the OpenWhisk action
by taking `index.ts` as an endpoint.

You can find the bundle in `dist/index.js` and deploy it either `yarn deploy` or manually with `wsk`
like `wsk action update /guest/mesh/swapi --kind nodejs:16 dist/index.js --web raw`.

> `--web raw` needs to be added to configure the action as a _raw_ web action.

## Running the project locally

`start` command will start Mesh server to mimic your API endpoint locally without deployment;

```sh
yarn start
```
