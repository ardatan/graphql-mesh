---
'@graphql-mesh/config': patch
'@graphql-mesh/types': patch
---

Fix incorrect import code generated based on the `logger` configuration option and the documentation suggesting to pass a logger instance instead of a file path.
