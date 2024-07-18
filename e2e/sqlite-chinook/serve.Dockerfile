FROM node:21 AS build

WORKDIR /build

# python3 is the default, necessary for npm i node-gyp build
RUN ln -s /usr/bin/python3 /usr/bin/python

# TODO: bundle transport-sqlite from source
RUN npm i sqlite3 tuql @graphql-mesh/transport-sqlite

# tuql should use main graphql
RUN rm -rf node_modules/tuql/node_modules/graphql

FROM mesh-serve_e2e

COPY --from=build /build/node_modules node_modules
