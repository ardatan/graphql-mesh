import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Load the single shared subgraph SDL (used by `buildSubgraphSchema` and, via
 * the running subgraph's `_service { sdl }`, by Apollo Rover).
 */
export function loadSubgraphSdl(
  name: 'users' | 'products' | 'inventory' | 'reviews',
  replacements: Record<string, string> = {},
): string {
  let sdl = readFileSync(join(__dirname, '..', 'subgraphs', `${name}.graphql`), 'utf8');
  for (const [key, value] of Object.entries(replacements)) {
    sdl = sdl.split(`{{${key}}}`).join(value);
  }
  return sdl;
}
