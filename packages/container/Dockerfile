FROM node:14-slim 

RUN groupadd -r mesh
RUN useradd --no-log-init -r -u 999 -g mesh mesh

WORKDIR /home/mesh
COPY package.json ./
COPY config/.meshrc.yaml ./

RUN yarn install --production

EXPOSE 3000

USER mesh
WORKDIR /home/mesh

CMD yarn start
