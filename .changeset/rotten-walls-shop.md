---
"@graphql-mesh/cli": minor
"@graphql-mesh/cross-helpers": minor
"@graphql-mesh/openapi": minor
"@graphql-mesh/soap": minor
"@omnigraph/json-schema": minor
"@graphql-mesh/runtime": minor
"@graphql-mesh/utils": minor
---

**Improvements on string interpolation ({env.sth} or {context.headers.sth}) for different environments**

As we mention in most of our docs, we usually expect a key-value `header` object in the context.
But Fetch-like environments don't have this kind of object but instead `Headers` object which is a kind `Map`.
Now Mesh can detect this and automatically convert it to the key-value object especially for Yoga users.

Also Mesh now handles `env` in a better way for non-Node environments;

Consider `import.meta.env` as `env` if available, else take `globalThis` as `env`.
