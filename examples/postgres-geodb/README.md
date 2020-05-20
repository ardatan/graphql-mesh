## Locations/Developers Examples

This example takes two API sources and merges them together:

1. Postgres GeoDB - a seed database of geo locations and their metadata (uses `postgraphile` handler)
2. GitHub GraphQL API - to fetch information about users and developers ((uses `graphql` handler))

The two schemas are connected and let you search for locations, and then fetch developers that are located in that location according to their GitHub account.

You should be able to run the following query and get the linked data:

```graphql
query locationsAndDevelopers {
  allCities(orderBy: ID_ASC, first: 10) {
    nodes {
      name
      countrycode
      district
      developers {
        login
        avatarUrl
      }
    }
  }
}
```

## Getting Started

Because a running Postgres DB is required, you need to setup local Postgres running, and load the schema and data seed.

To do that, run the following:

1. Install and run Postgres using Docker - `docker run --name pg-docker -e POSTGRES_PASSWORD=docker -d -p 5432:5432 postgres`
2. Install Postgres CLI: `brew upgrade postgresql` (or, you can use any of your favorite tool)
3. Seed the DB with data: `curl https://raw.githubusercontent.com/morenoh149/postgresDBSamples/master/worldDB-1.0/world.sql | psql -h localhost -d postgres -U postgres`

Now, to have access to the GitHub GraphQL API, start by creating a personal access token here: https://github.com/settings/tokens , and put it in an environment variable called `GH_ACCESS_TOKEN`.

Then you should be able to use the `mesh:serve` script to run it:

```
GH_ACCESS_TOKEN="your token here" yarn mesh:serve
```

## Using the Generated SDK

This example also generates SDK based on operations (located under `./src/test.query.graphql`). 

The following command will generate the fully type-safe SDK for you:

```
GH_ACCESS_TOKEN="your token here" yarn mesh:sdk
```

You can find the code that uses the generates SDK under `./src/test.ts`, it imports for the generated code and prints the result nicely to the console. You can run it with:

```
GH_ACCESS_TOKEN="your token here" yarn test:sdk
```

