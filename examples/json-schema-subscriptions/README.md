### Subscriptions based on JSON Schema Handler

This example has a schemaless API Server that has two endpoints and one webhook;

GET `/todos` returns all `Todo` entities kept on inmemory database.
POST `/todo` adds a new `Todo` to the inmemory database and returns it with a generated id

Everytime you call `/todo` endpoint, it sends `Todo` as a payload

#### How to run

You can run API server with `yarn start:api` command and Mesh with `yarn start:mesh` then you can try the example queries you see in the playground.
You can go to the GraphQL Playground with this URL; `http://localhost:4000/graphql`

#### Extra: Live Queries

This example also shows Live Queries instead of Subscriptions
