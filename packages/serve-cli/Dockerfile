# IMPORTANT: make sure bundle is ready with `yarn bundle`

# we build with Node 21 because node-libcurl has published prebuilt releases (building from source fails when using Node 22)
FROM node:21 AS build

WORKDIR /build

COPY bundle/package.json package.json
RUN npm i

COPY bundle .

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

COPY --from=build /build .

RUN chown -R node .

USER node
ENTRYPOINT ["dumb-init", "node", "--enable-source-maps", "."]
