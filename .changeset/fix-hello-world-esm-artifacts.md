---
"@graphql-mesh/cli": patch
---

When `package.json` is `"type": "module"`, emit Mesh artifacts as ESM `index.js` (not CJS, and not a missing `index.mjs`) so examples like hello-world-esm can start.
