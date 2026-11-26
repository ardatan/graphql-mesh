#!/usr/bin/env node
/**
 * Build static HTML for https://specs.graphql-mesh.dev from content/*.graphql
 * and families.json. Output: specs/out/
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, 'out');
const version = 'v0.1';
const origin = 'https://specs.graphql-mesh.dev';

const families = JSON.parse(readFileSync(join(root, 'families.json'), 'utf8'));

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function layout({ title, body, canonical }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="canonical" href="${esc(canonical)}">
<link rel="stylesheet" href="/assets/spec.css">
</head>
<body>
<header class="site">
  <a class="brand" href="/">GraphQL Mesh Specs</a>
  <span class="origin">${esc(origin)}</span>
</header>
<main>
${body}
</main>
<footer class="site">
  <p>Mesh <code>@link</code> URLs are identifiers first. These pages publish the directive SDL for each family.</p>
  <p><a href="https://github.com/ardatan/graphql-mesh">ardatan/graphql-mesh</a></p>
</footer>
</body>
</html>
`;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, 'assets'), { recursive: true });
cpSync(join(root, 'assets', 'spec.css'), join(outDir, 'assets', 'spec.css'));

const redirects = [];
const familyCards = [];

for (const family of families) {
  const sdlPath = join(root, 'content', family.name, `${version}.graphql`);
  const sdl = readFileSync(sdlPath, 'utf8');
  const url = `${origin}/${family.name}/${version}`;
  const pageDir = join(outDir, family.name);
  mkdirSync(pageDir, { recursive: true });

  // Exact path without trailing slash (matches stamped @link URLs).
  writeFileSync(join(pageDir, `${version}.html`), layout({
    title: `${family.title} ${version}`,
    canonical: url,
    body: `
<article class="spec">
  <p class="crumb"><a href="/">specs</a> / ${esc(family.name)} / ${esc(version)}</p>
  <h1>${esc(family.title)} <span class="ver">${esc(version)}</span></h1>
  <p class="lede">${esc(family.summary)}</p>
  <p class="url"><code>${esc(url)}</code></p>
  <p class="raw"><a href="/${esc(family.name)}/${esc(version)}.graphql">Raw SDL</a></p>
  <h2>Import</h2>
  <pre class="graphql"><code>extend schema
  @link(
    url: "${esc(url)}"
    import: [${family.imports.map(i => `"${esc(i)}"`).join(', ')}]
  )</code></pre>
  ${
    family.notes?.length
      ? `<h2>Notes</h2><ul>${family.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`
      : ''
  }
  <h2>Directive schema</h2>
  <pre class="graphql"><code>${esc(sdl.trim())}</code></pre>
</article>
`,
  }));

  writeFileSync(join(pageDir, `${version}.graphql`), sdl);
  redirects.push(`/${family.name}/${version}/ /${family.name}/${version} 301`);

  familyCards.push(`
    <li>
      <a href="/${esc(family.name)}/${esc(version)}">
        <strong>${esc(family.name)}</strong>
        <span>${esc(version)}</span>
      </a>
      <p>${esc(family.summary)}</p>
    </li>`);
}

writeFileSync(
  join(outDir, 'index.html'),
  layout({
    title: 'GraphQL Mesh Specs',
    canonical: origin + '/',
    body: `
<article class="home">
  <h1>GraphQL Mesh Specs</h1>
  <p class="lede">Directive families for Mesh <code>@link</code> stamps:
  <code>${esc(origin)}/&lt;family&gt;/${esc(version)}</code>.</p>
  <ul class="families">
  ${familyCards.join('\n')}
  </ul>
  <h2>Legacy</h2>
  <p>Readers may still accept older
  <code>https://the-guild.dev/graphql/mesh/spec/...</code> stamps.
  New Mesh output uses only <code>specs.graphql-mesh.dev</code>.</p>
</article>
`,
  }),
);

writeFileSync(join(outDir, '_redirects'), redirects.join('\n') + '\n');
writeFileSync(
  join(outDir, '_headers'),
  `/*.graphql
  Content-Type: text/plain; charset=utf-8
  Access-Control-Allow-Origin: *

/
  Access-Control-Allow-Origin: *
`,
);

console.log(`Wrote ${families.length} families to ${outDir}`);
