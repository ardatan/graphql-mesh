---
'@graphql-mesh/migrate-config-cli': patch
---

Make v0 config migration testable and document handler/transform mappings. The CLI now fails without writing on unsupported config, supports `--dry-run` and `--force`, and maps more GraphQL/transform options instead of dumping YAML as-is.
