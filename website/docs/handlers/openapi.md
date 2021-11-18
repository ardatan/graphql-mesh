---
id: openapi
title: OpenAPI / Swagger
sidebar_label: 'OpenAPI / Swagger'
---
![image](https://user-images.githubusercontent.com/20847995/79218686-7ba7b900-7e59-11ea-8a5e-676a83b9f86e.png)

This handler allows you to load remote or local [OpenAPI (2/3) and Swagger](https://swagger.io) schemas. Based on [OpenAPI-to-GraphQL](https://developer.ibm.com/open/projects/openapi-to-graphql).

You can import it using remote/local `.json` or `.yaml`.

To get started, install the handler library from NPM:

```sh
yarn add @graphql-mesh/openapi
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: MyOpenapiApi
    handler:
      openapi:
        source: ./my-schema.json
```

## Overriding default Query/Mutation operations
By default, OpenAPI-to-GraphQL will place all GET operations into Query fields and all other operations into Mutation fields; with this option you can manually override this process.
In order to switch between Query and Mutation operations, and vice versa, you need to define a rule per override, consisting of: OAS title, path of the operation, method of the operation and finally the destination type (e.g. Query or Mutation).
See example below:

```yaml
sources:
  - name: MyOpenapiApi
    handler:
      openapi:
        source: ./my-schema.json
        selectQueryOrMutationField:
          - title: "Weather Service v1" # OAS title
            path: /weather/current # operation path
            method: post
            type: Query # switch method POST from default Mutation into Query
          - title: "Weather Service v1" # OAS title
            path: /weather/forecast # operation path
            method: get
            type: Mutation # switch method GET from default Query into Mutation
```

## Dynamic Header Values

Mesh can take dynamic values from the GraphQL Context or the environmental variables. If you use `mesh dev` or `mesh start`, GraphQL Context will be the incoming HTTP request.

The expression inside dynamic values should be as in JS.

### From Context (HTTP Header for `mesh dev` or `mesh start`)

```yml
sources:
  - name: MyGraphQLApi
    handler:
      openapi:
        source: ./my-schema.json
        operationHeaders:
          # Please do not use capital letters while getting the headers
          Authorization: Bearer {context.headers['x-my-api-token']}
          # You can also access to the cookies like below;
          # Authorization: Bearer {context.cookies.myApiToken}
```

And for `mesh dev` or `mesh start`, you can pass the value using `x-my-graphql-api-token` HTTP header.

### From Environmental Variable

`MY_API_TOKEN` is the name of the environmental variable you have the value.

```yml
sources:
  - name: MyGraphQLApi
    handler:
      openapi:
        source: ./my-schema.json
        operationHeaders:
          Authorization: Bearer {env.MY_API_TOKEN}
```

## Advanced cookies handling

When building a web application, for security reasons, cookies are often used for authentication. Mobile applications on the other end, tend to use a HTTP header.

This section shows how to configure GraphQL Mesh to accept either, and also how to use GraphQL Mesh to set / unset cookies on the login & logout mutations.

### Accepting one of cookie, header or context value

We want to accept one of: an `accessToken` cookie, an `Authorization` header, or an authorization value available in context (e.g. set by a GraphQL auth plugin), and transmit it to the Rest API as a `Authorization` header. GraphQL Mesh does not allow dynamic selection in the `meshrc.yaml` file, but that's fine! We can use a bit of trickery.

```yml
sources:
  - name: Rest
    handler:
      openapi:
        source: ./openapi.yaml
        baseUrl: "{env.REST_URL}/api/"
        operationHeaders:
          Authorization-Header: "{context.headers.authorization}"
          Authorization-Cookie: Bearer {context.cookies.accessToken}
        customFetch: ./src/custom-fetch.js
```

Here in the `meshrc.yaml` configuration we store the cookie in `Authorization-Cookie`, and the header in `Authorization-Header`. Now to introduce the logic needed to generate the proper `Authorization` header for the Rest API, we need to implement a `customFetch`. It will replace the `fetch` used by GraphQL Mesh to call the Rest API.

```js
const fetch = require('node-fetch')

module.exports = (url, args, context) => {
  // Set Authorization header dynamically to context value, or input cookie, or input header
  args.headers['authorization'] = context.authorization || args.headers['authorization-cookie'] || args.headers['authorization-header'];
  // Clean up headers forwarded to the Rest API
  delete args.headers['authorization-cookie'];
  delete args.headers['authorization-header'];
  // Execute the fetch with the new headers
  return fetch(url, args)
}
```

Of course, `node-fetch` needs to be added to your project: `npm add node-fetch`.

### Setting / Unsetting the cookie

Of course, being able to use GraphQL Mesh as a Gateway for both the mobile application and web application is nice, but there's one thing missing: the setting of the cookie for the web application.

For that, we need to access the HTTP response that is sent back to the client. Luckily, we can do so in `additionalResolvers`. So we need to create two new resolvers, one for login and one for logout, and manage the cookie in their code.

The first step is to edit the `meshrc.yaml` file, add this at the end:

```yml
additionalTypeDefs: |
  extend type Mutation {
    login(credentials: Credentials!): String
    logout: Boolean
  }
additionalResolvers:
  - ./src/additional-resolvers.js
```

Then manage the cookie in the new resolvers:

```js
// lifespan of our cookie
const oneYear = 365 * 24 * 3600

const resolvers = {
  Mutation: {
    async login(root, args, context, info) {
      // Call the Rest API's login operation
      const result = await context.Rest.Mutation.accountLogin({
        root,
        args: {
          credentials: args.credentials
        },
        context,
        info
      })
      // if `result` contains a JWT token, you could instead decode it and set `Expires`
      // to the JWT token's expiration date
      res.set('Set-Cookie', `accessToken=${result}; Path=/; Secure; HttpOnly; Max-Age=${oneYear};`)

      return result
    },
    logout(root, args, { res }) {
      // use old date to unset cookie
      res.set('Set-Cookie', `accessToken=logout; Path=/; Secure; HttpOnly; Expires=Thu, 1 Jan 1970 00:00:00 GMT;`)

      return true
    },
  },
}

module.exports = { resolvers }
```

## Examples

We have a lot of examples for OpenAPI Handler;
- [JavaScript Wiki](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-javascript-wiki)
- [Location Weather](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-location-weather)
- [StackExchange](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-stackexchange)
- [Stripe](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-stripe)
- [Subscriptions Example with Webhooks](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-subscriptions)
- [Youtrack](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-youtrack)

## Config API Reference

{@import ../generated-markdown/OpenapiHandler.generated.md}
