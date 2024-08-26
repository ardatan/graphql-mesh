// tsx package-binary.ts <platform> <arch>

import fs from 'node:fs/promises';
import os from 'node:os';
import { $ } from 'zx';

const platform = (process.argv[2] || os.platform()).toLowerCase();
const arch = (process.argv[3] || os.arch()).toLowerCase();

const isDarwin = platform.includes('darwin') || platform.includes('macos');
const isWindows = platform.includes('windows');
const isLinux = platform.includes('linux');
if (!isDarwin && !isWindows && !isLinux) {
  throw new Error(`Unsupported platform ${platform}`);
}

const dest = 'mesh-serve' + (isWindows ? '.exe' : '');

console.log(`Packaging binary with Node SEA for ${platform}-${arch} to ${dest}`);

console.log('Generating blob');
await $`node --experimental-sea-config sea-config.json`;

console.log(`Using node at ${process.execPath}`);
await fs.copyFile(process.execPath, dest);

console.log('Injecting blob');
if (isWindows) {
  await $`npx postject ${dest} NODE_SEA_BLOB sea-prep.blob ^
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;
} else if (isDarwin) {
  await $`npx postject ${dest} NODE_SEA_BLOB sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
    --macho-segment-name NODE_SEA`;
} else {
  await $`npx postject ${dest} NODE_SEA_BLOB sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;
}

console.log('Signing binary');
if (isDarwin) {
  await $`codesign --remove-signature ${dest}`;
  await $`codesign --sign - ${dest}`;
} else if (isWindows) {
  await $`signtool remove /s ${dest}`;
  await $`signtool sign /fd SHA256 ${dest}`;
} else {
  console.warn('Signing skipped because unsupported platform');
}

if (isDarwin || isLinux) {
  console.log('Setting exec permissions');
  await $`chmod +x ${dest}`;
}

console.log('Done');
