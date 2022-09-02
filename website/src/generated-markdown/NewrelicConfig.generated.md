
* `includeOperationDocument` (type: `Boolean`) - default `false`. When set to `true`, includes the GraphQL document defining the operations and fragments
* `includeExecuteVariables` (type: `Boolean`) - default `false`. When set to `true`, includes all the operation variables with their values
* `includeRawResult` (type: `Boolean`) - default: `false`. When set to `true`, includes the execution result
* `trackResolvers` (type: `Boolean`) - default `false`. When set to `true`, track resolvers as segments to monitor their performance
* `includeResolverArgs` (type: `Boolean`) - default `false`. When set to `true`, includes all the arguments passed to resolvers with their values
* `rootFieldsNaming` (type: `Boolean`) - default `false`. When set to `true` append the names of operation root fields to the transaction name
* `extractOperationName` (type: `String`) - Allows to set a custom operation name to be used as transaction name and attribute
`extractOperationName: {context.headers['x-operation-name']}`