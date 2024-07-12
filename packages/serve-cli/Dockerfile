# IMPORTANT: make sure bundle is ready with `yarn bundle`

# we build with node 21 because node-libcurl has published prebuilt releases (building from source fails)
FROM node:21 AS build

LABEL org.opencontainers.image.title="Mesh Serve"
LABEL org.opencontainers.image.description="GraphQL Gateway by The Guild for anything-to-GraphQL"
LABEL org.opencontainers.image.licenses=MIT
LABEL org.opencontainers.image.source=https://github.com/ardatan/graphql-mesh/tree/master/packages/serve-cli
LABEL org.opencontainers.image.documentation=https://the-guild.dev/graphql/mesh/v1/serve/deployment/docker

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
  dumb-init \
  # clean
  && apt-get clean

WORKDIR /serve

COPY --from=build /build .

USER node
ENTRYPOINT ["dumb-init", "node", "."]
