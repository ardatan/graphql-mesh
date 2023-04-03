
* `mode` (type: `String (bare | wrap)`) - Specify to apply resolvers-composition transforms to bare schema or by wrapping original schema
* `compositions` (type: `Array of Object`, required) - Array of resolver/composer to apply: 
  * `resolver` (type: `String`, required) - The GraphQL Resolver path
Example: Query.users
  * `composer` (type: `Any`, required) - Path to the composer function
Example: ./src/auth.js#authComposer