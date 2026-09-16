
* `indices` (type: `Boolean`) - When arrays are stringified, by default they are not given explicit indices:
`a=b&a=c&a=d`
You may override this by setting the indices option to true:
`a[0]=b&a[1]=c&a[2]=d`
* `arrayFormat` (type: `String (indices | brackets | repeat | comma)`) - You can configure how to format arrays in the query strings.

Note: when using arrayFormat set to 'comma', you can also pass the commaRoundTrip option set to true or false, to append [] on single-item arrays, so that they can round trip through a parse.
* `commaRoundTrip` (type: `Boolean`) - Even if there is a single item in an array, this option treats them as arrays
(default: false)
* `jsonStringify` (type: `Boolean`) - Stringify the nested objects as JSON
(default: false)