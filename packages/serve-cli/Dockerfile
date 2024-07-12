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

COPY bundle/package.json package.json
RUN npm i

COPY bundle .

USER node
ENTRYPOINT ["dumb-init", "node", "."]
