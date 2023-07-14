
* `host` (type: `String`) - The hostname of the database you are connecting to. (Default: localhost)
* `port` (type: `Int`) - The port number to connect to. (Default: 3306)
* `localAddress` (type: `String`) - The source IP address to use for TCP connection
* `user` (type: `String`) - The MySQL user to authenticate as
* `password` (type: `String`) - The password of that MySQL user
* `database` (type: `String`) - Name of the database to use for this connection
* `ssl` (type: `Object`): 
  * `rejectUnauthorized` (type: `Boolean`) - Default: true
  * `ca` (type: `String`) - Path to your CA
* `pool` (type: `Any`) - Use existing `Pool` instance
Format: modulePath#exportName
* `tables` (type: `Array of String`, required) - Use specific tables for your schema
* `tableFields` (type: `Array of Object`, required) - Use specific fields of specific tables: 
  * `table` (type: `String`, required)
  * `fields` (type: `Array of String`, required)