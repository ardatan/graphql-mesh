FROM node:22 AS build

WORKDIR /build

# python3 is the default, necessary for npm i node-gyp build
RUN ln -s /usr/bin/python3 /usr/bin/python

RUN npm i sqlite3 tuql

# tuql should use main graphql
RUN rm -rf node_modules/tuql/node_modules/graphql

FROM mesh-serve_e2e

# INFO: we copy to system node_modules because sqlite transport and loader is bundled there
COPY --from=build /build/node_modules /node_modules
