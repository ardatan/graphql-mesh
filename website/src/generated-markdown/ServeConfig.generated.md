
* `fork` -  - Spawn multiple server instances as node clusters (default: `1`) One of: 
  * `Int`
  * `Boolean`
* `port` -  - TCP Port to listen (default: `4000`) One of: 
  * `Int`
  * `String`
* `hostname` (type: `String`) - The binding hostname (default: `localhost`)
* `cors` (type: `Object`) - Configuration for CORS: 
  * `origin` (type: `Any`)
  * `allowedHeaders` (type: `Array of String`)
  * `exposedHeaders` (type: `Array of String`)
  * `credentials` (type: `Boolean`)
  * `maxAge` (type: `Int`)
  * `preflightContinue` (type: `Boolean`)
  * `optionsSuccessStatus` (type: `Int`)
* `staticFiles` (type: `String`) - Path to your static files you want to be served with GraphQL Mesh HTTP Server
* `playground` (type: `Boolean`) - Show GraphiQL Playground
* `sslCredentials` (type: `Object`) - SSL Credentials for HTTPS Server
If this is provided, Mesh will be served via HTTPS: 
  * `key` (type: `String`, required)
  * `cert` (type: `String`, required)
* `endpoint` (type: `String`) - Path to GraphQL Endpoint (default: /graphql)
* `browser` -  - Path to the browser that will be used by `mesh serve` to open a playground window in development mode
This feature can be disabled by passing `false` One of: 
  * `String`
  * `Boolean`
* `customServerHandler` (type: `String`) - If you want to use a custom GraphQL server, you can pass the path of the code file that exports a custom Mesh Server Handler
With a custom server handler, you won't be able to use the features of GraphQL Mesh HTTP Server
* `playgroundTitle` (type: `String`) - Title of GraphiQL Playground
* `trustProxy` (type: `String`) - Configure Express Proxy Handling
[Learn more](https://expressjs.com/en/guide/behind-proxies.html)