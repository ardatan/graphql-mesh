---
"json-machete": minor
"@omnigraph/json-schema": minor
---

## New debug logging for `healJSONSchema`
JSON Schema loader tries to fix your JSON Schema while creating a final bundle for Mesh. Usually it works and it has a chance to have a different result rather than you expect. In the long term, if you don't fix your JSON Schema, you might get different results once the internals of `healJSONSchema` is changed.

In order to see which parts of your schema need to be fixed, you can enable the debug mode with `DEBUG=healJSONSchema` environment variable.

## New debug details in the field descriptions with `DEBUG=fieldDetails`
Now you can see which operation has which HTTP request details in the field description with the new debug mode.
![image](https://user-images.githubusercontent.com/20847995/182913565-a9d9c521-519b-4d57-88a9-13ea3edab96a.png)
