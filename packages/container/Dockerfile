FROM node:14-alpine 

RUN addgroup -S mesh && adduser -S mesh -G mesh

WORKDIR /home/mesh
COPY package.json ./
COPY config/.meshrc.yaml /config

RUN yarn install --production

EXPOSE 4000

USER mesh
WORKDIR /home/mesh

CMD yarn start
