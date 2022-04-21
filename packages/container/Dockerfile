FROM node:18-alpine 

RUN addgroup -S mesh && adduser -S mesh -G mesh

WORKDIR /home/mesh
COPY package.json ./
COPY config /config

RUN yarn install --production

ENV PORT 4000
ENV CONFIG_PATH "/config"
EXPOSE 4000

USER mesh
WORKDIR /home/mesh

CMD yarn start --dir $CONFIG_PATH
