# syntax=docker/dockerfile:1.9-labs

# IMPORTANT: make sure bundle is ready with `yarn bundle`

# we build with Node 21 because node-libcurl has published prebuilt releases (building from source fails when using Node 22)
FROM node:21 AS install

WORKDIR /install

RUN npm i \
  uNetworking/uWebSockets.js#semver:^20 \
  node-libcurl

#

FROM node:22-slim

RUN apt-get update && apt-get install -y \
  # for healthchecks
  wget curl \
  # for proper signal propagation
  dumb-init && \
  # clean
  apt-get clean

WORKDIR /serve

COPY --chown=root --from=install /install/node_modules /node_modules
COPY --chown=root --exclude=dist bundle /
COPY --chown=root bundle/dist .

# node user can create files and install modules, but not modify the bundle (existing contents)
RUN chown node . && \
  echo "{}" > package.json && chown node package.json && chown -R node node_modules

USER node
ENTRYPOINT ["dumb-init", "node", "--enable-source-maps", "bin.mjs"]
