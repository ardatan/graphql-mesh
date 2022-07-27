
* `connectionString` (type: `String`) - A connection string to your Postgres database
* `schemaName` (type: `Array of String`, required) - An array of strings which specifies the PostgreSQL schemas that PostGraphile will use to create a GraphQL schema. The default schema is the public schema.
* `pool` (type: `Any`) - Connection Pool instance or settings or you can provide the path of a code file that exports any of those
* `appendPlugins` (type: `Array of String`) - Extra Postgraphile Plugins to append
* `skipPlugins` (type: `Array of String`) - Postgraphile Plugins to skip (e.g. "graphile-build#NodePlugin")
* `options` -  - Extra Postgraphile options that will be added to the postgraphile constructor. It can either be an object or a string pointing to the object's path (e.g. "./my-config#options"). See the [postgraphile docs](https://www.graphile.org/postgraphile/usage-library/) for more information. One of: 
  * `JSON`
  * `String`
* `subscriptions` (type: `Boolean`) - Enable GraphQL websocket transport support for subscriptions (default: true)
* `live` (type: `Boolean`) - Enables live-query support via GraphQL subscriptions (sends updated payload any time nested collections/records change) (default: true)