---
'@graphql-mesh/serve-cli': minor
---

Add CLI arguments for polling and error masking

The usage of arguments is as follows:

```
Usage: mesh-serve [options]

Options:
  --polling <intervalInMs>  schema polling interval in milliseconds (env: POLLING)
  --masked-errors           mask unexpected errors in responses (default: true)
  --no-masked-errors        don't mask unexpected errors in responses
```
