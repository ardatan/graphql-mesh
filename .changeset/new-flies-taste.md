---
"@omnigraph/json-schema": minor
---

feat(json-schema): new exposeResponseMetadata flag to expose the details of the HTTP responses received from the upstream

```yml
responseSchema: ...
exposeResponseMetadata: true
```

Now you will have another field called `$response` in the response type;

```graphql
type MyResponseType {
  myFooField: String
  _response: ResponseMetadata
}

type ResponseMetadata {
  url: URL
  status: Int
  method: String
  headers: JSON
  body: String
}
```


