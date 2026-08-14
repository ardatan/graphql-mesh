---
"@omnigraph/json-schema": patch
"@omnigraph/openapi": patch
---

Fix `allOf` deep merge crashing when both sub-schemas share a `required` nested field

**Root cause:** When two `allOf` sub-schemas both declared the same nested object property (e.g. `info`) and one side marked that property as `required`, graphql-compose wrapped the nested type in a `NonNullComposer`. The deep-merge logic then tried to merge a `NonNullComposer` with a plain `ObjectTypeComposer`, which raised a runtime error because it expected both sides to be the same kind of composer.

**Fix:** The merge logic now unwraps `NonNull`/`List` wrappers before recursing into the nested merge, then re-applies the non-null (or list) wrapper to the merged result.

**Before:**

```json
{
  "title": "Movie",
  "allOf": [
    {
      "type": "object",
      "properties": {
        "info": {
          "type": "object",
          "properties": { "id": { "type": "string" } },
          "required": ["id"]
        }
      }
    },
    {
      "type": "object",
      "properties": {
        "info": {
          "type": "object",
          "properties": { "rating": { "type": "number" } }
        }
      }
    }
  ]
}
```

```
# Before — runtime crash during schema generation:
# TypeError: Cannot merge NonNullComposer with ObjectTypeComposer
```

**After:**

```graphql
# After — merged successfully, info field retains non-null and all sub-fields
type Movie {
  info: MovieInfo!
}

type MovieInfo {
  id: String!
  rating: Float
}
```
