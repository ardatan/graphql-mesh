
* `if` -  - Expression for when to activate this extension.
Value can be a valid JS expression string or a boolean One of: 
  * `String`
  * `Boolean`
* `apply` (type: `Array of String`, required) - Resolver to be applied
For example;
  apply:
      - Query.* \<- * will apply this extension to all fields of Query type
      - Mutation.someMutationButProbablyYouWontNeedIt
* `outputDir` (type: `String`, required) - Path to the directory of the generated snapshot files
* `respectSelectionSet` (type: `Boolean`) - Take snapshots by respecting the requested selection set.
This might be needed for the handlers like Postgraphile or OData that rely on the incoming GraphQL operation.
