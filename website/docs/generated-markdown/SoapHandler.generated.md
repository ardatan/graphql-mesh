
* `wsdl` (type: `String`, required) - A url to your WSDL
* `basicAuth` (type: `Object`) - Basic Authentication Configuration
Including username and password fields: 
  * `username` (type: `String`, required) - Username for Basic Authentication
  * `password` (type: `String`, required) - Password for Basic Authentication
* `securityCert` (type: `Object`) - SSL Certificate Based Authentication Configuration
Including public key, private key and password fields: 
  * `publicKey` (type: `String`) - Your public key
  * `privateKey` (type: `String`) - Your private key
  * `password` (type: `String`) - Password
  * `publicKeyPath` (type: `String`) - Path to the file or URL contains your public key
  * `privateKeyPath` (type: `String`) - Path to the file or URL contains your private key
  * `passwordPath` (type: `String`) - Path to the file or URL contains your password
* `schemaHeaders` (type: `Any`) - JSON object representing the Headers to add to the runtime of the API calls only for schema introspection
You can also provide `.js` or `.ts` file path that exports schemaHeaders as an object
* `operationHeaders` (type: `JSON`) - JSON object representing the Headers to add to the runtime of the API calls only for operation during runtime
* `includePorts` (type: `Boolean`) - If true, the ports defined in the WSDL will be represented as GraphQL-Type objects in the schema.
The fields of the object will be the operations of the port.

Most soap-endpoints only define one port; so including it in the schema will just be inconvenient.
But if there are multiple ports with operations of the same name, you should set this option to true.
Otherwise only one of the identical-named operations will be callable.

default: false
* `includeServices` (type: `Boolean`) - If true, the services defined in the WSDL will be represented as GraphQL-Type objects in the schema.
The fields of the object will be the ports of the service (or the operation, dependent on 'includePorts').

Most soap-endpoints only define one service; so including it in the schema will just be inconvenient.
But if there are multiple services with operations of the same name, you should set this option to true.
Otherwise only one of the identical-named operations will be callable.

default: false
* `selectQueryOrMutationField` (type: `Array of Object`) - Allows to explicitly override the default operation (Query or Mutation) for any SOAP operation: 
  * `service` (type: `String`, required)
  * `port` (type: `String`, required)
  * `operation` (type: `String`, required)
  * `type` (type: `String (query | mutation)`, required)
* `selectQueryOperationsAuto` (type: `Boolean`) - Automatically put operations starts with `query` or `get` into the Query type