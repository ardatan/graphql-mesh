---
"@graphql-mesh/transform-rename": patch
---

Fixed issue that made argument renaming impossible when using regular expressions in types and fields when using 'bare' mode.
The unit tests for bare and wrap mode have also been reworked to verify that both modes deliver the same results.
