
* `matches` -  - If the following patterns match the request URL, the response will be cached. Array of: 
  * `String`
  * `object`: 
    * `protocol` (type: `String`)
    * `username` (type: `String`)
    * `password` (type: `String`)
    * `hostname` (type: `String`)
    * `port` (type: `String`)
    * `pathname` (type: `String`)
    * `search` (type: `String`)
    * `hash` (type: `String`)
    * `baseURL` (type: `String`)
* `ignores` -  - If the following patterns match the request URL, the response will not be cached. Array of: 
  * `String`
  * `object`: 
    * `protocol` (type: `String`)
    * `username` (type: `String`)
    * `password` (type: `String`)
    * `hostname` (type: `String`)
    * `port` (type: `String`)
    * `pathname` (type: `String`)
    * `search` (type: `String`)
    * `hash` (type: `String`)
    * `baseURL` (type: `String`)