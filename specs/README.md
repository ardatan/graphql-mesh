# GraphQL Mesh Directives Specification

Static site for the GraphQL Mesh Directives Specification hosted at
[https://specs.graphql-mesh.dev](https://specs.graphql-mesh.dev).

Index lists Current Specs and All Schemas. Each family page is written for schema authors and
implementers (how each directive works, and what a conforming implementation must do), with a TOC,
numbered definitions, and a sibling raw `.graphql` artifact.

## Layout

| Path                              | Role                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| `families.json`                   | Family metadata (title, summary, imports, stamp notes)           |
| `content/<family>/v0.1.graphql`   | Directive SDL source of truth (loader / compose shapes)          |
| `content/<family>/v0.1.docs.json` | Dual-audience prose per directive / arg (not GraphQL `"""` docs) |
| `generate.mjs`                    | Builds `out/` HTML + copies SDL                                  |
| `assets/spec.css`                 | Spec-md-like styles                                              |
| `out/`                            | Deploy artifact (generated in CI; local via `node generate.mjs`) |

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

GitHub Actions workflow `.github/workflows/specs.yml` runs only when `specs/**` or the workflow file
changes (not on every PR). It deploys `specs/out` to the Cloudflare Pages project
`graphql-mesh-specs` (same account secrets as the main website). On pull requests it posts a sticky
preview comment with the Pages alias URL (same pattern as the website workflow). Production URLs:

- https://specs.graphql-mesh.dev
- https://graphql-mesh-specs.pages.dev
