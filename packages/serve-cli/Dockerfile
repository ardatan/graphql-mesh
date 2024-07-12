# make sure bundle is ready with `yarn bundle`

FROM node:22-slim

RUN apt-get update && apt-get install -y \
  # for healthchecks
  wget \
  # for installing uWS
  git \
  # for proper signal propagation
  dumb-init \
  # cleanup
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# these two cannot be bundled so we install them as deps
# TODO: node-libcurl
RUN npm i uNetworking/uWebSockets.js#v20.44.0
RUN npm pkg set type=module
RUN npm pkg set main=bin.js
COPY bundle .

USER node
ENTRYPOINT ["dumb-init", "node", "."]
