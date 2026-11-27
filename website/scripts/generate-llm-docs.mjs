/**
 * Static-export Mesh docs: write /llms.txt and /v2/**.md twins into public/.
 * Run before `next build` / `next dev` so crawlers and agents get Markdown.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(__dirname, '..');
const contentRoot = path.join(websiteRoot, 'src/content/v2');
const publicRoot = path.join(websiteRoot, 'public');
const siteUrl = (process.env.SITE_URL || 'https://the-guild.dev/graphql/mesh').replace(/\/$/, '');
const specsLlms = 'https://specs.graphql-mesh.dev/llms.txt';

function readMeta(dir) {
  const metaPath = path.join(dir, '_meta.ts');
  if (!fs.existsSync(metaPath)) return null;
  const src = fs.readFileSync(metaPath, 'utf8');
  // `_meta.ts` is a default-export object of string | { title, ... } | Meta object.
  const match = src.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) return null;
  try {
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${match[1]})`)();
  } catch {
    return null;
  }
}

function titleOf(metaValue, fallback) {
  if (typeof metaValue === 'string') return metaValue;
  if (metaValue && typeof metaValue === 'object' && typeof metaValue.title === 'string') {
    return metaValue.title;
  }
  return fallback;
}

function listMdxFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMdxFiles(full));
    else if (entry.name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

function routeFromFile(file) {
  let rel = path.relative(contentRoot, file).replace(/\\/g, '/');
  rel = rel.replace(/\.mdx$/, '');
  if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
  if (rel === 'index') return '/v2';
  return `/v2/${rel}`;
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { data: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: raw };
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, '');
  const data = {};
  let key = null;
  let buf = [];
  for (const line of fm.split('\n')) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (m && !m[2].startsWith('|') && !/^ {2}/.test(line)) {
      if (key)
        data[key] = buf
          .join(' ')
          .trim()
          .replace(/^["']|["']$/g, '');
      key = m[1];
      buf = [m[2]];
      if (m[2] === '>' || m[2] === '|') buf = [];
    } else if (key) {
      buf.push(line.trim());
    }
  }
  if (key)
    data[key] = buf
      .join(' ')
      .trim()
      .replace(/^["']|["']$/g, '');
  return { data, body };
}

function firstHeading(body) {
  const m = /^#\s+(.+)$/m.exec(body);
  return m ? m[1].trim() : null;
}

function walkNav(dir, hrefBase, meta) {
  const entries = [];
  const order = meta ? Object.keys(meta) : [];
  const seen = new Set();

  const visitKey = key => {
    if (seen.has(key) || key.startsWith('_')) return;
    seen.add(key);
    const childDir = path.join(dir, key);
    const pageFile = path.join(dir, `${key}.mdx`);
    const indexFile = path.join(childDir, 'index.mdx');
    const title = titleOf(meta?.[key], key);

    // Nested `_meta` "index" is the section root already registered by the parent key.
    if (key === 'index') {
      if (fs.existsSync(pageFile)) {
        const route = hrefBase === '/v2' ? '/v2' : hrefBase;
        entries.push({ route, title, file: pageFile });
      }
      return;
    }

    if (fs.existsSync(pageFile)) {
      entries.push({ route: `${hrefBase}/${key}`, title, file: pageFile });
    } else if (fs.existsSync(indexFile)) {
      entries.push({
        route: `${hrefBase}/${key}`,
        title,
        file: indexFile,
      });
    }

    if (fs.existsSync(childDir) && fs.statSync(childDir).isDirectory()) {
      const childMeta = readMeta(childDir);
      entries.push(...walkNav(childDir, `${hrefBase}/${key}`, childMeta));
    }
  };

  for (const key of order) visitKey(key);

  // Files not listed in _meta
  for (const file of listMdxFiles(dir)) {
    const route = routeFromFile(file);
    if (entries.some(e => e.route === route)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    const { body } = parseFrontmatter(raw);
    entries.push({ route, title: firstHeading(body) || path.basename(route), file });
  }

  return entries;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeMarkdownTwin(file, route) {
  const raw = fs.readFileSync(file, 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const title = data.title || firstHeading(body) || route;
  const description = data.description || '';
  const front = [
    '---',
    `title: ${JSON.stringify(title)}`,
    description ? `description: ${JSON.stringify(description)}` : null,
    `canonical: ${JSON.stringify(`${siteUrl}${route}`)}`,
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  const outPath =
    route === '/v2'
      ? path.join(publicRoot, 'v2.md')
      : path.join(publicRoot, `${route.slice(1)}.md`);
  ensureDir(outPath);
  fs.writeFileSync(outPath, `${front}\n\n${body.trim()}\n`);
  return { route, title, description };
}

function main() {
  const rootMeta = readMeta(contentRoot) || {};
  const nav = walkNav(contentRoot, '/v2', rootMeta);

  // Dedupe by route (prefer first / meta-ordered)
  const byRoute = new Map();
  for (const entry of nav) {
    if (!byRoute.has(entry.route)) byRoute.set(entry.route, entry);
  }

  const pages = [];
  for (const entry of byRoute.values()) {
    pages.push(writeMarkdownTwin(entry.file, entry.route));
  }

  // Also expose /v2/index.md twin for agents that append index
  const indexPage = pages.find(p => p.route === '/v2');
  if (indexPage) {
    const src = path.join(publicRoot, 'v2.md');
    const dest = path.join(publicRoot, 'v2', 'index.md');
    ensureDir(dest);
    fs.copyFileSync(src, dest);
  }

  const lines = [
    '# GraphQL Mesh',
    '',
    '> Federation Framework for any API -- generate or hand-write Mesh subgraph SDL, compose, and serve on Hive Gateway or any Federation-compatible gateway.',
    '',
    '## Specs',
    '',
    `- [Mesh directive specs (llms.txt)](${specsLlms})`,
    '',
    '## Mesh v2 documentation',
    '',
    ...pages.map(p => {
      const desc = p.description ? `: ${p.description}` : '';
      return `- [${p.title}](${siteUrl}${p.route}.md)${desc}`;
    }),
    '',
  ];

  fs.writeFileSync(path.join(publicRoot, 'llms.txt'), lines.join('\n'));
  console.log(`Wrote public/llms.txt and ${pages.length} Markdown twins under public/v2`);
}

main();
