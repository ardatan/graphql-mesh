## GeoDB-Events Example

This example takes two API sources based on Openapi 3 (events) and Postgres DB (GeoDB), and links between them.

It allow you to query for cities / locations, and include fields for asking for events in that place.

## Getting Started

Because a running Postgres DB is required, you need to setup local Postgres running, and load the schema and data seed.

To do that, run the following:

1. Install and run Postgres using Docker - `docker run --name pg-docker -e POSTGRES_PASSWORD=docker -d -p 5432:5432  postgres`
2. Install Postgres CLI: `brew upgrade postgresql` (or, you can use any of your favorite tool) 
3. Seed the DB with data: `curl https://raw.githubusercontent.com/morenoh149/postgresDBSamples/master/worldDB-1.0/world.sql | psql -h localhost -d postgres -U postgres`

Now, you can run `yarn dev` and use the Mesh :) 