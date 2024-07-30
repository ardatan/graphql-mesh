# Website

## Installation

```sh
yarn --ignore-optional
```

## Pre-requisites

In order to run the project successfully in your system, you would require `python 2.x` to be
installed (used by `node-pre-gyp` to build some dependencies)

You can install it in Linux based distributions using `sudo apt update && sudo apt install python`

More about this [here](https://github.com/ardatan/graphql-mesh/issues/1543)

### Local Development

```sh
yarn start
```

This command starts a local development server and open up a browser window. Most changes are
reflected live without having to restart the server.

### Build

```sh
yarn build
```

This command generates static content into the `build` directory and can be served using any static
contents hosting service.

### Deployment

```sh
GIT_USER= yarn < YOUR_GITHUB_USERNAME > USE_SSH=true deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and
push to the `gh-pages` branch.
