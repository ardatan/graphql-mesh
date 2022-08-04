---
"json-machete": minor
"@omnigraph/json-schema": minor
---

JSON Schema loader tries to fix your JSON Schema while creating a final bundle for Mesh. Usually it works and it has a chance to have a different result rather than you expect. In the long term, if you don't fix your JSON Schema, you might get different results once the internals of `healJSONSchema` is changed.

In order to see which parts of your schema need to be fixed, you can enable the debug mode with `DEBUG=1` environment variable.
