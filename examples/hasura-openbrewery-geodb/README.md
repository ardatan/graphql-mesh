# Locations Breweries Example

This example takes two API sources and merges them together:

1. Postgres GeoDB - a seed database of geo locations and their metadata (uses Hasura GraphQL Engine)
2. OpenBrewery API - a free API for public information on breweries, cideries, brewpubs, and bottleshops.

The two schemas are connected and let you search for locations, and then fetch breweries that are located in that location.

### Create GeoDB Database

Because a running Postgres DB is required, you need to setup local Postgres running, and load the schema and data seed.

To do that, run the following:

1. Install and run Postgres using Docker - `docker run --name pg-docker -e POSTGRES_PASSWORD=docker -d -p 5432:5432 postgres`
2. Install Postgres CLI: `brew upgrade postgresql` (or, you can use any of your favorite tool)
3. Seed the DB with data: `curl https://raw.githubusercontent.com/morenoh149/postgresDBSamples/master/worldDB-1.0/world.sql | psql -h localhost -d postgres -U postgres`

### Create Hasura Instance

We need to install Hasura using Docker but we will use a special version of Hasura to benefit from Remote Joins;

```
docker run -d -p 8080:8080 \
  -e HASURA_GRAPHQL_DATABASE_URL=postgres://postgres:docker@host.docker.internal:5432/postgres \
  -e HASURA_GRAPHQL_ENABLE_CONSOLE=true \
  hasura/graphql-engine:pull2392-b621ea90
```

### Create GraphQL Mesh Project

We need to have `yarn` and Node.js on our computer to run GraphQL Mesh locally.
Run the following command to create a new project on an empty directory;
```bash
yarn init
```
Answer the questions of `yarn` about our new project, then install GraphQL Mesh dependencies;
```bash
yarn add graphql @graphql-mesh/cli @graphql-mesh/json-schema
```

### Create Proxy GraphQL API to OpenBrewery

OpenBrewery doesn't have any kind of recognized schema metadata, so we need to create our own using JSON Schema Handler;

In OpenBrewery's documentation, they have examples for both request and response objects. Let's create files for each inside `/json-schemas` directory;

```json
// breweries.json
[
    {
        "id": 299,
        "name": "Almanac Beer Company",
        "brewery_type": "micro",
        "street": "651B W Tower Ave",
        "city": "Alameda",
        "state": "California",
        "postal_code": "94501-5047",
        "country": "United States",
        "longitude": "-122.306283180899",
        "latitude": "37.7834497667258",
        "phone": "4159326531",
        "website_url": "http://almanacbeer.com",
        "updated_at": "2018-08-23T23:24:11.758Z",
        "tag_list": ["tag"]
      }
]

//breweriesInput.json
{
    "by_city": "san diego",
    "by_name": "cooper",
    "by_state": "ohio",
    "by_postal": "44107",
    "by_type": "micro",
    "by_tag": "patio",
    "by_tags": ["patio", "dog-friendly"],
    "page": 15,
    "per_page": 25,
    "sort": "-"
}
```

What we need to do is create a new Mesh configuration file on the project root `.meshrc.yml`;

```yaml
sources:
  - name: OpenBrewery
    handler:
      jsonSchema:
        baseUrl: https://api.openbrewerydb.org
        operations:
          - type: Query
            field: breweries
            path: breweries
            method: GET
            requestSample: ./json-samples/breweriesInput.json
            responseSample: ./json-samples/breweries.json
```

### Run GraphQL Mesh

Run our new GraphQL Mesh instance with the following command;
```bash
yarn mesh dev
```

### Connect new OpenBrewery API to Hasura

Go to [Remote Schemas](http://localhost:8080/console/remote-schemas/manage/schemas) tab in Hasura and add our OpenBrewery GraphQL API which has `http://host.docker.internal:4000/graphql`.

> `host.docker.internal` is used because Docker accesses your host machine `localhost` under this alias.

### Create GraphQL fields for GeoDB

Go to [Data](http://localhost:8080/console/data/schema/public) tab in Hasura and track all the tables to see how complex relationships work with Mesh.

### Create Remote Join between GeoDB and OpenBrewery

Let's say we would like to see breweries in a specific city. Go to [Data](http://localhost:8080/console/data/schema/public) tab in Hasura and scroll down to **Remote Relationships** section. Add `breweries` field to `City` by connecting `breweries.by_city` argument and `City.name` parent field like below;

![image](https://user-images.githubusercontent.com/20847995/83945179-a71fa200-a811-11ea-81fc-e641e68bc9ce.png)

### Make a query to see how it works

Go to [GraphiQL](http://localhost:8080/console/api-explorer) and make a query like below to see how the integration works;

```graphql
{
  city(where: {name: {_eq: "New York"}}) {
    name
    breweries {
      name
      phone
    }
  }
}
```
