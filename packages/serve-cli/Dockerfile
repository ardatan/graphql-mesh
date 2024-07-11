# make sure mesh is built with `yarn build`

FROM node:22-slim

RUN apt-get update && \
  apt-get install -y \
  # for healtchecks
  wget \
  # for installing uWS
  git \
  # for proper signal propagation
  dumb-init \
  # cleanup
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY dist/package.json package.json
RUN yarn set version stable
RUN yarn

COPY dist .

USER node
ENTRYPOINT ["dumb-init", "node", "./esm/bin.js"]
