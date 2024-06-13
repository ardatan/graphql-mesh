---
'@graphql-mesh/transport-rest': patch
---

Do not consume the uploaded file inside the fetch call, and pass it to the upstream directly as a
stream
