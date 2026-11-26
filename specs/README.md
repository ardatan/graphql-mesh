# GraphQL Mesh Specs

Static site for Mesh `@link` directive families hosted at
[https://specs.graphql-mesh.dev](https://specs.graphql-mesh.dev).

## Layout

| Path | Role |
| --- | --- |
| `families.json` | Family metadata (title, summary, imports, notes) |
| `content/<family>/v0.1.graphql` | Directive SDL source of truth |
| `generate.mjs` | Builds `out/` HTML + copies SDL |
| `assets/spec.css` | Shared styles |
| `out/` | Deploy artifact (generated in CI; local via `node generate.mjs`) |

URL contract:

```text
https://specs.graphql-mesh.dev/<family>/v0.1
https://specs.graphql-mesh.dev/<family>/v0.1.graphql
```

Families: `core`, `pubsub`, `auth`, `rate-limit`, `sql`, `thrift`, `mongo`, `neo4j`, `protobuf`.

## Local preview

```bash
node specs/generate.mjs
npx --yes serve specs/out
```

## Deploy

GitHub Actions workflow `.github/workflows/specs.yml` deploys `specs/out` to the
Cloudflare Pages project `graphql-mesh-specs` (same account secrets as the main
website). After the first production deploy, bind the custom domain
`specs.graphql-mesh.dev` in the Cloudflare Pages project settings (DNS is
already on Cloudflare for `graphql-mesh.dev`).
