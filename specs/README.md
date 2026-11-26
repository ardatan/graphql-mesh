# GraphQL Mesh Specs

Static site for Mesh `@link` directive families hosted at
[https://specs.graphql-mesh.dev](https://specs.graphql-mesh.dev).

Index lists Current Specs and All Schemas. Each family page has a TOC, numbered directive /
schema-addition sections, and a sibling raw `.graphql` artifact.

## Layout

| Path                            | Role                                                             |
| ------------------------------- | ---------------------------------------------------------------- |
| `families.json`                 | Family metadata (title, summary, imports, stamp notes)           |
| `content/<family>/v0.1.graphql` | Directive SDL source of truth (loader / compose shapes)          |
| `generate.mjs`                  | Builds `out/` HTML + copies SDL                                  |
| `assets/spec.css`               | Spec-md-like styles                                              |
| `out/`                          | Deploy artifact (generated in CI; local via `node generate.mjs`) |

URL contract:

```text
https://specs.graphql-mesh.dev/<family>/v0.1
https://specs.graphql-mesh.dev/<family>/v0.1.graphql
```

Directive inventory (stamp status + family lists) lives in the Project store doc
`docs/mesh-specs-directive-inventory.md`.

## Local preview

```bash
node specs/generate.mjs
npx --yes serve specs/out
```

## Deploy

GitHub Actions workflow `.github/workflows/specs.yml` deploys `specs/out` to the Cloudflare Pages
project `graphql-mesh-specs` (same account secrets as the main website). Production URLs:

- https://specs.graphql-mesh.dev
- https://graphql-mesh-specs.pages.dev
