# Website

This website is built using [Docusaurus 2](https://v2.docusaurus.io/), a modern static website generator.

### Installation

```
$ yarn --ignore-optional
```

`--ignore-engines` is required if you are using node versions greater than `14.0` since the `@apollo/federation` package being used is incompatible with them.

## Pre-requisites

In order to run the project successfully in your system, you would require `python 2.x` to be installed (used by `node-pre-gyp` to build some of the dependencies)

You can install it in Linux based distributions using `sudo apt update && sudo apt install python`

More about this [here](https://github.com/Urigo/graphql-mesh/issues/1543)

## Generate API Docs (on the root directory)

This command generates API Documentation and its sidebar configuration.

`yarn build:api-docs`

### Local Development

```
$ yarn start
```

This command starts a local development server and open up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

```
$ GIT_USER=<Your GitHub username> USE_SSH=true yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
