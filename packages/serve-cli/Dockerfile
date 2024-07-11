FROM node:22-slim

RUN apt-get update && \
  apt-get install -y dumb-init wget && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

# make sure mesh is built with `yarn build`
COPY dist .

RUN npm i

USER node
ENTRYPOINT ["dumb-init", "node", "./esm/bin.js"]
