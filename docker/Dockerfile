FROM node:22

WORKDIR /app

COPY package.json ./
COPY mesh.config.ts ./

RUN npm i

EXPOSE 4000

ENTRYPOINT ["npx", "mesh-serve"]
