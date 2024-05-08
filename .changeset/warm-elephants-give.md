---
"@graphql-mesh/fusion-runtime": patch
"@graphql-mesh/serve-runtime": patch
---

Ability to debug query planning by using `EXPOSE_DELEGATION_PLAN=1` environment variable, so you can see the delegation plan in the result extensions.

If you want to log it to the console, you can enable `DEBUG=1` environment variable as well.
