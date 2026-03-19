---
'json-machete': patch
---

Fix `$ref` resolution for JSON Schema 2020-12 `$id` and `$anchor` patterns. Previously,
`dereferenceObject` treated all non-fragment `$ref` values as file paths, causing ENOENT errors when
specs used `$id`-based URIs or `$anchor` fragment references (e.g. Petstore 3.1). A pre-scan now
indexes `$id` and `$anchor` declarations so they resolve within the document per the spec.
