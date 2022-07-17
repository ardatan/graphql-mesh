
* `if` (type: `Boolean`) - If this expression is truthy, mocking would be enabled
You can use environment variables expression, for example: `${MOCKING_ENABLED}`
* `preserveResolvers` (type: `Boolean`) - Do not mock any other resolvers other than defined in `mocks`.
For example, you can enable this if you don't want to mock entire schema but partially.
* `mocks` (type: `Array of Object`) - Mock configurations: 
  * `apply` (type: `String`, required) - Resolver path
Example: User.firstName
  * `if` (type: `Boolean`) - If this expression is truthy, mocking would be enabled
You can use environment variables expression, for example: `${MOCKING_ENABLED}`
  * `faker` (type: `String`) - Faker.js expression or function
Read more (https://github.com/marak/Faker.js/#fakerfake)
Example:
faker: name.firstName
faker: `{{ name.firstName }} {{ name.lastName }}`
  * `custom` (type: `String`) - Custom mocking
It can be a module or json file.
Both "moduleName#exportName" or only "moduleName" would work
  * `length` (type: `Int`) - Length of the mock list
For the list types `[ObjectType]`, how many `ObjectType` you want to return?
default: 2
  * `store` (type: `Object`) - Get the data from the mock store: 
    * `type` (type: `String`)
    * `key` (type: `ID`)
    * `fieldName` (type: `String`)
  * `updateStore` (type: `Array of Object`) - Update the data on the mock store: 
    * `type` (type: `String`)
    * `key` (type: `ID`)
    * `fieldName` (type: `String`)
    * `value` (type: `String`)
* `initializeStore` (type: `Any`) - The path to the code runs before the store is attached to the schema