
* `if` -  - Expression for when to activate this extension.
Value can be a valid JS expression string or a boolean One of: 
  * `String`
  * `Boolean`
* `apply` (type: `Array of String`, required) - HTTP URL pattern to be applied
For example;
  apply:
      - http://my-remote-api.com/* \<- * will apply this extension to all paths of remote API
* `outputDir` (type: `String`, required) - Path to the directory of the generated snapshot files