# make sure bundle is ready with `yarn bundle`

FROM node:22-slim

LABEL org.opencontainers.image.title="Mesh Serve"
LABEL org.opencontainers.image.description="GraphQL Gateway by The Guild for anything-to-GraphQL"
LABEL org.opencontainers.image.licenses=MIT
LABEL org.opencontainers.image.source=https://github.com/ardatan/graphql-mesh/tree/master/packages/serve-cli
LABEL org.opencontainers.image.documentation=https://the-guild.dev/graphql/mesh/v1/serve/deployment/docke

RUN apt-get update && apt-get install -y \
  # for healthchecks
  wget \
  # for installing uWS
  git \
  # for proper signal propagation
  dumb-init \
  # cleanup
  && rm -rf /var/lib/apt/lists/*

WORKDIR /serve

COPY bundle/package.json package.json
RUN npm i

COPY bundle .

USER node
ENTRYPOINT ["dumb-init", "node", "."]
