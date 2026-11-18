import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** twirp-ts is CJS; type-only names must not be value-imported under Node ESM/tsx. */
const file = join(dirname(fileURLToPath(import.meta.url)), '../services/twirp/gen/movies.twirp.ts');
let src = readFileSync(file, 'utf8');
src = src.replace(
  /import \{[\s\S]*?\} from "twirp-ts";\nimport \{ MovieRequest, MoviesResult \} from "\.\/movies";/,
  `import {
  TwirpContentType,
  TwirpError,
  TwirpErrorCode,
  TwirpServer,
  chainInterceptors,
  type TwirpContext,
} from "twirp-ts";
import type { Interceptor, RouterEvents } from "twirp-ts";
import { MovieRequest, MoviesResult } from "./movies.js";`,
);
writeFileSync(file, src);
console.log('patched', file);
