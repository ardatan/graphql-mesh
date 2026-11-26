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

You can find the bundle in `dist/index.js`.

> **Deploy note:** this monorepo pins `graphql@17` (Node 22+). Stock OpenWhisk `action-nodejs-v16` /
> `nodejs:16` images are **not** a supported runtime for that GraphQL major. Yarn root
> `resolutions.graphql` intentionally keeps the workspace on a single GraphQL major — per-example
> `graphql@16` pins cannot override it. Use the example for local `yarn dev` / bundling, or deploy
> with a **custom Node 22+** action image as below.

### Deploy with a custom Node 22+ action image

1. Build or pull a Node 22+ OpenWhisk action image your cluster can run (stock Apache OpenWhisk
   images stop at Node 16/20). Example placeholder: `your-registry/openwhisk-nodejs22:latest`.
2. Point `build.js` `target` at `node22` (already set in this example) and run `yarn build`.
3. Deploy the bundle against that image (not `--kind nodejs:16`):

```sh
wsk action update /guest/mesh/swapi dist/index.js \
  --docker your-registry/openwhisk-nodejs22:latest \
  --web raw
```

`yarn deploy` uses the same `--docker` form — replace the image name in `package.json` with yours.

> `--web raw` needs to be added to configure the action as a _raw_ web action.

## Running the project locally

`yarn dev` runs `src/index.ts` with a local HTTP listener (same gateway runtime the
OpenWhisk `main` export uses), so you can hit the example without deploying:

```sh
yarn dev
# → http://localhost:4000/api/v1/web/guest/mesh/swapi/graphql
```
