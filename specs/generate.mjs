#!/usr/bin/env node
/**
 * Build static HTML for https://specs.graphql-mesh.dev from content/*.graphql
 * and families.json. Index lists Current Specs + All Schemas; each family page
 * has a TOC and numbered directive / schema-addition sections.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, 'out');
const origin = 'https://specs.graphql-mesh.dev';

const families = JSON.parse(readFileSync(join(root, 'families.json'), 'utf8'));

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Split SDL into top-level definitions (directive / enum / scalar / type). */
function splitDefinitions(sdl) {
  const lines = sdl.replace(/\r\n/g, '\n').split('\n');
  const defs = [];
  let buf = [];
  let depth = 0;
  const flush = () => {
    const text = buf.join('\n').trim();
    if (text && !text.split('\n').every(l => l.trim() === '' || l.trim().startsWith('#'))) {
      defs.push(text);
    }
    buf = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') && depth === 0 && buf.length === 0) {
      continue;
    }
    // Require a name after the keyword so arg lines like `type: String` do not split.
    if (
      depth === 0 &&
      buf.length > 0 &&
      /^(directive\s+@|enum\s+\w|scalar\s+\w|type\s+\w|input\s+\w|union\s+\w)/.test(trimmed)
    ) {
      flush();
    }
    buf.push(line);
    depth += (line.match(/\{/g) || []).length;
    depth -= (line.match(/\}/g) || []).length;
    if (depth < 0) depth = 0;
    if (depth === 0 && buf.length > 0 && /\)\s*(repeatable\s+)?on\b/.test(buf.join('\n'))) {
      // Directive defs often have no braces; flush when locations line complete.
      const joined = buf.join('\n');
      if (/^directive\s+@/.test(joined.trim()) && !joined.includes('{')) {
        flush();
      }
    }
  }
  flush();
  return defs;
}

function defMeta(text) {
  const t = text.trim();
  const dir = t.match(/^directive\s+(@[\w]+)/);
  if (dir) {
    return { kind: 'directive', name: dir[1], id: dir[1], text: t };
  }
  const en = t.match(/^enum\s+(\w+)/);
  if (en) return { kind: 'enum', name: en[1], id: en[1], text: t };
  const sc = t.match(/^scalar\s+(\w+)/);
  if (sc) return { kind: 'scalar', name: sc[1], id: sc[1], text: t };
  const ty = t.match(/^(?:type|input|union)\s+(\w+)/);
  if (ty) return { kind: 'type', name: ty[1], id: ty[1], text: t };
  return { kind: 'other', name: 'Definition', id: `def-${Math.random().toString(36).slice(2, 8)}`, text: t };
}

function parseDirectiveArgs(text) {
  const m = text.match(/directive\s+@\w+\s*\(([\s\S]*?)\)\s*(repeatable\s+)?on\b/);
  if (!m) return [];
  const body = m[1].trim();
  if (!body) return [];
  return body
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const am = l.match(/^(\w+)\s*:\s*(.+?)(?:,)?$/);
      if (!am) return null;
      return { name: am[1], type: am[2].replace(/,$/, '').trim() };
    })
    .filter(Boolean);
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
<header class="site-bar">
  <a class="brand" href="/">Mesh Specs</a>
  <span class="origin">${esc(origin)}</span>
</header>
${body}
<footer class="site-bar foot">
  <p>Family URLs are Mesh <code>@link</code> identifiers. Each page includes a TOC, numbered definitions, and raw <code>.graphql</code>.</p>
  <p><a href="https://github.com/ardatan/graphql-mesh">ardatan/graphql-mesh</a></p>
</footer>
</body>
</html>
`;
}

function familyPage(family, sdl) {
  const version = family.version || 'v0.1';
  const url = `${origin}/${family.name}/${version}`;
  const defs = splitDefinitions(sdl).map(defMeta);
  const directives = defs.filter(d => d.kind === 'directive');
  const companions = defs.filter(d => d.kind !== 'directive');

  let sec = 0;
  const tocItems = [];
  const sections = [];

  sec += 1;
  tocItems.push(`<li><a href="#sec-Overview"><span class="spec-secid">${sec}</span>Overview</a></li>`);
  sections.push(`
<section id="sec-Overview" secid="${sec}">
  <h1 class="spec-definition-head"><span class="spec-secid"><a href="#sec-Overview">${sec}</a></span>Overview</h1>
  <p>${esc(family.summary)}</p>
  <p class="url"><code>${esc(url)}</code>
    · <a href="/${esc(family.name)}/${esc(version)}.graphql">raw GraphQL</a></p>
  <p class="stamp"><strong>Stamp:</strong> ${esc(family.stamp || 'see inventory')}</p>
  <figure class="spec-example">
    <figcaption>Example @link usage</figcaption>
    <pre class="graphql"><code>extend schema
  @link(
    url: "${esc(url)}"
    import: [${family.imports.map(i => `"${esc(i)}"`).join(', ')}]
  )</code></pre>
  </figure>
  ${
    family.notes?.length
      ? `<ul class="notes">${family.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`
      : ''
  }
</section>`);

  if (companions.length) {
    sec += 1;
    const cSec = sec;
    tocItems.push(
      `<li><a href="#sec-Schema-additions"><span class="spec-secid">${cSec}</span>Schema additions</a><ol>${companions
        .map((c, i) => `<li><a href="#${esc(c.id)}"><span class="spec-secid">${cSec}.${i + 1}</span>${esc(c.name)}</a></li>`)
        .join('')}</ol></li>`,
    );
    sections.push(`
<section id="sec-Schema-additions" secid="${cSec}">
  <h1 class="spec-definition-head"><span class="spec-secid"><a href="#sec-Schema-additions">${cSec}</a></span>Schema additions</h1>
  ${companions
    .map((c, i) => {
      const id = `${cSec}.${i + 1}`;
      return `
  <section id="${esc(c.id)}" secid="${id}">
    <h2 class="spec-definition-head"><span class="spec-secid"><a href="#${esc(c.id)}">${id}</a></span>${esc(c.name)}</h2>
    <figure class="spec-definition"><pre class="graphql"><code>${esc(c.text)}</code></pre></figure>
  </section>`;
    })
    .join('')}
</section>`);
  }

  sec += 1;
  const dSec = sec;
  tocItems.push(
    `<li><a href="#sec-Directives"><span class="spec-secid">${dSec}</span>Directives</a><ol>${directives
      .map((d, i) => `<li><a href="#${esc(d.id)}"><span class="spec-secid">${dSec}.${i + 1}</span>${esc(d.name)}</a></li>`)
      .join('')}</ol></li>`,
  );

  const dirSections = directives
    .map((d, i) => {
      const id = `${dSec}.${i + 1}`;
      const args = parseDirectiveArgs(d.text);
      const argBlocks = args
        .map((a, j) => {
          const aid = `${id}.${j + 1}`;
          const argId = `${d.id}.${a.name}`;
          return `
    <section id="${esc(argId)}" secid="${aid}">
      <h3 class="spec-definition-head"><span class="spec-secid"><a href="#${esc(argId)}">${aid}</a></span>${esc(a.name)}: ${esc(a.type)}</h3>
    </section>`;
        })
        .join('');
      return `
  <section id="${esc(d.id)}" secid="${id}">
    <h2 class="spec-definition-head"><span class="spec-secid"><a href="#${esc(d.id)}">${id}</a></span>${esc(d.name)}</h2>
    <figure class="spec-definition"><pre class="graphql"><code>${esc(d.text)}</code></pre></figure>
    ${argBlocks}
  </section>`;
    })
    .join('');

  sections.push(`
<section id="sec-Directives" secid="${dSec}">
  <h1 class="spec-definition-head"><span class="spec-secid"><a href="#sec-Directives">${dSec}</a></span>Directives</h1>
  ${dirSections}
</section>`);

  return layout({
    title: `${family.title} ${version}`,
    canonical: url,
    body: `
<article class="spec-page">
  <p class="crumb"><a href="/">specs</a> / ${esc(family.name)} / ${esc(version)}</p>
  <h1 class="page-title">${esc(family.title)} <span class="ver">${esc(version)}</span></h1>
  <p class="lede">${esc(family.summary)}</p>
  <nav class="spec-toc">
    <div class="title">Contents</div>
    <ol>${tocItems.join('')}</ol>
  </nav>
  ${sections.join('\n')}
</article>
`,
  });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, 'assets'), { recursive: true });
cpSync(join(root, 'assets', 'spec.css'), join(outDir, 'assets', 'spec.css'));

const redirects = [];
const currentSpecs = [];
const allSchemas = [];

families.forEach((family, index) => {
  const version = family.version || 'v0.1';
  const sdlPath = join(root, 'content', family.name, `${version}.graphql`);
  const sdl = readFileSync(sdlPath, 'utf8');
  const pageDir = join(outDir, family.name);
  mkdirSync(pageDir, { recursive: true });
  writeFileSync(join(pageDir, `${version}.html`), familyPage(family, sdl));
  writeFileSync(join(pageDir, `${version}.graphql`), sdl);
  redirects.push(`/${family.name}/${version}/ /${family.name}/${version} 301`);

  const n = index + 1;
  currentSpecs.push(`
<section id="sec-${esc(family.name)}-${esc(version)}" secid="1.${n}">
  <h2><span class="spec-secid"><a href="#sec-${esc(family.name)}-${esc(version)}">1.${n}</a></span>
    <a href="/${esc(family.name)}/${esc(version)}">${esc(family.title)} ${esc(version)}</a></h2>
  <p>${esc(family.summary)}</p>
</section>`);
  allSchemas.push(
    `<li><a href="/${esc(family.name)}/${esc(version)}">${esc(family.name)}/${esc(version)}</a> (<a href="/${esc(family.name)}/${esc(version)}.graphql">graphql</a>)</li>`,
  );
});

writeFileSync(
  join(outDir, 'index.html'),
  layout({
    title: 'GraphQL Mesh Specs',
    canonical: `${origin}/`,
    body: `
<article class="spec-page home">
  <h1 class="page-title">GraphQL Mesh Specs</h1>
  <p class="lede">Directive families for Mesh <code>@link</code> stamps at
  <code>${esc(origin)}/&lt;family&gt;/v0.1</code>
  (overview, TOC, numbered definitions, raw GraphQL).</p>
  <nav class="spec-toc">
    <div class="title">Contents</div>
    <ol>
      <li><a href="#sec-Current-Specs"><span class="spec-secid">1</span>Current Specs</a>
        <ol>${families
          .map(
            (f, i) =>
              `<li><a href="#sec-${esc(f.name)}-${esc(f.version || 'v0.1')}"><span class="spec-secid">1.${i + 1}</span>${esc(f.title)} ${esc(f.version || 'v0.1')}</a></li>`,
          )
          .join('')}</ol>
      </li>
      <li><a href="#sec-All-Schemas"><span class="spec-secid">2</span>All Schemas</a></li>
    </ol>
  </nav>
  <section id="sec-Current-Specs" secid="1">
    <h1 class="spec-definition-head"><span class="spec-secid"><a href="#sec-Current-Specs">1</a></span>Current Specs</h1>
    ${currentSpecs.join('\n')}
  </section>
  <section id="sec-All-Schemas" secid="2">
    <h1 class="spec-definition-head"><span class="spec-secid"><a href="#sec-All-Schemas">2</a></span>All Schemas</h1>
    <ul class="all-schemas">${allSchemas.join('\n')}</ul>
    <h2>Outside this host</h2>
    <ul>
      <li>HTTP/REST Connectors <code>@connect</code> / <code>@source</code>: <a href="https://specs.apollo.dev/connect/v0.2">specs.apollo.dev/connect</a></li>
      <li>Federation / join / link specs: <a href="https://specs.apollo.dev/">specs.apollo.dev</a></li>
      <li>Legacy Mesh catch-all (read-only): <code>https://the-guild.dev/graphql/mesh/spec/v1.0</code></li>
    </ul>
  </section>
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
