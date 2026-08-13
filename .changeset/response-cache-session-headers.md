---
'@graphql-mesh/plugin-response-cache': patch
---

Fix `sessionId` / `if` / `cacheKey` templates so Fetch `Headers` on the request are usable (e.g. `{context.headers.test}`), matching Yoga's `(request, context)` callback signature.
