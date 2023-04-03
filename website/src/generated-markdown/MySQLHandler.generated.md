
* `host` (type: `String`)
* `port` (type: `Int`)
* `user` (type: `String`)
* `password` (type: `String`)
* `database` (type: `String`)
* `pool` (type: `Any`) - Use existing `Pool` instance
Format: modulePath#exportName
* `tables` (type: `Array of String`, required) - Use specific tables for your schema
* `tableFields` (type: `Array of Object`, required) - Use specific fields of specific tables: 
  * `table` (type: `String`, required)
  * `fields` (type: `Array of String`, required)