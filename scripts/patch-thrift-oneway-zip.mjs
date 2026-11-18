#!/usr/bin/env node
/**
 * @creditkarma/thrift-typescript@3.7.6 emits REPLY/EXCEPTION for oneway `zip`.
 * Re-apply empty-body `process_zip` after each codegen run.
 *
 * Usage: node scripts/patch-thrift-oneway-zip.mjs <Calculator.ts> [...]
 */
import fs from 'node:fs';

function findMethodRange(src, name) {
  const startRe = new RegExp(`^([ \\t]*)public ${name}\\(`, 'm');
  const start = src.match(startRe);
  if (!start || start.index == null) return null;
  const methodIndent = start[1];
  let i = start.index + start[0].length;
  while (i < src.length && src[i] !== '{') i++;
  if (src[i] !== '{') return null;
  let depth = 0;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return { start: start.index, end: i + 1, indent: methodIndent };
      }
    }
  }
  return null;
}

function patchedMethod(indent) {
  const L = line => indent + line;
  return [
    L(
      'public process_zip(requestId: number, input: thrift.TProtocol, output: thrift.TProtocol, context: Context): Promise<Buffer> {',
    ),
    L('    return new Promise<void>((resolve, reject): void => {'),
    L('        try {'),
    L('            input.readMessageEnd();'),
    L('            resolve(this._handler.zip(context));'),
    L('        } catch (err) {'),
    L('            reject(err);'),
    L('        }'),
    L('    }).then((): Buffer => {'),
    L('        // ONEWAY zip: do not write REPLY / EXCEPTION envelopes.'),
    L('        // Patched by scripts/patch-thrift-oneway-zip.mjs after thrift-typescript codegen.'),
    L('        return Buffer.alloc(0);'),
    L('    }).catch((): Buffer => {'),
    L('        // ONEWAY: still no response body on handler failure.'),
    L('        return Buffer.alloc(0);'),
    L('    });'),
    L('}'),
  ].join('\n');
}

function patchFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const range = findMethodRange(src, 'process_zip');
  if (!range) {
    throw new Error(`Could not find process_zip method in ${filePath}`);
  }
  const body = src.slice(range.start, range.end);
  const alreadyGood =
    !/MessageType\.REPLY|MessageType\.EXCEPTION/.test(body) &&
    /Buffer\.alloc\(0\)/.test(body) &&
    /patch-thrift-oneway-zip/.test(body);
  if (alreadyGood) {
    console.log(`ok (already patched): ${filePath}`);
    return false;
  }
  const next = src.slice(0, range.start) + patchedMethod(range.indent) + src.slice(range.end);
  fs.writeFileSync(filePath, next);
  console.log(`patched: ${filePath}`);
  return true;
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/patch-thrift-oneway-zip.mjs <Calculator.ts>...');
  process.exit(2);
}
for (const f of files) patchFile(f);
