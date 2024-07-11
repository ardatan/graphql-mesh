FROM node:21.7.3-slim

RUN apt-get update && apt-get install -y wget dumb-init

USER node

WORKDIR /app

COPY package.json ./

RUN npm i --only=production

EXPOSE 4000

ENTRYPOINT ["dumb-init", "./node_modules/.bin/mesh-serve"]
