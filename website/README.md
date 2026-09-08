# GraphQL Mesh docs

The documentation at [the-guild.dev/graphql/mesh](https://the-guild.dev/graphql/mesh) is authored
here and rendered by [the-guild-org/website](https://github.com/the-guild-org/website), which
fetches this folder at build time. Nothing in this folder is built or deployed on its own.

## Layout

| Path                      | What it is                                                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content/v1/`             | The Mesh v1 documentation, served under `/v1`. Folder order and titles come from each folder's `meta.json`.                                                                       |
| `content/docs/`           | The Mesh v0 documentation, kept under `/docs` with an "old version" banner.                                                                                                       |
| `generated/`              | Config-reference Markdown generated from the packages' `yaml-config.graphql` files by `yarn generate-config-schema`. Pages import these; regenerate after changing a config type. |
| `assets/`                 | Images referenced from pages as `/assets/...`, the favicon, and the social cover image.                                                                                           |
| `install-hive-gateway.sh` | The Hive Gateway binary installer, served at `/graphql/mesh/install-hive-gateway.sh`.                                                                                             |

## Writing pages

- Frontmatter: `title` (required) and `description`. The site renders the title as the page heading,
  so pages do not start with an `# H1`. Use `sidebarTitle` when the sidebar should show a shorter
  label.
- Ordering: each folder's `meta.json` lists `pages` in display order; a folder's `title` is its
  sidebar label.
- Components available without importing: `Callout`, `Tabs` / `Tabs.Tab`, `Cards` / `Cards.Card`,
  `Steps`, `FileTree`. Name code blocks with ` ```ts title="mesh.config.ts" `, and use
  ` ```sh npm2yarn ` for install commands.
- Config reference: `import API from '../../generated/<Type>.generated.md'` then `<API />`.
- Links between pages are root-relative to this product: `/v1/source-handlers/openapi`.

## Previewing changes

Every same-repository pull request that touches this folder gets a preview at
`https://mesh-pr-<number>.guild-dev-website.pages.dev/graphql/mesh` (linked in a PR comment within
about ten minutes). Merges to `master` redeploy the live docs automatically.
