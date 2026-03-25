---
'@graphql-mesh/string-interpolation': patch
---

When `{missing}` tries to interpolate `missing` key from the context, it returns `undefined`. If the entire string is just the placeholder, it should return `undefined` instead of the string with `undefined` in it. This change adds a check for this case and returns `undefined` when the entire string is a placeholder for an undefined value.
