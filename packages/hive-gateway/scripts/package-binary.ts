// tsx package-binary.ts [platform] [arch]

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import { inject } from 'postject';

const platform = (process.argv[2] || os.platform()).toLowerCase();
const arch = (process.argv[3] || os.arch()).toLowerCase();

const isDarwin = platform.includes('darwin') || platform.includes('macos');
const isWindows = platform.includes('win32');
const isLinux = platform.includes('linux');
if (!isDarwin && !isWindows && !isLinux) {
  throw new Error(`Unsupported platform ${platform}`);
}

const dest = 'hive-gateway' + (isWindows ? '.exe' : '');

const signToolPath =
  'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.18362.0\\x64\\signtool.exe';

console.log(`Packaging binary with Node SEA for ${platform}-${arch} to ${dest}`);

console.log('Generating blob');
execSync(`node --experimental-sea-config sea-config.json`);

console.log(`Using node from ${process.execPath}`);
await fs.copyFile(process.execPath, dest);

if (isDarwin) {
  console.log('Removing the signature w/ codesign');
  execSync(`codesign --remove-signature ${dest}`);
} else if (isWindows) {
  try {
    console.log('Removing the signature w/ signtool');
    execSync(`"${signToolPath}" remove /s ${dest}`);
  } catch (e) {
    console.warn('Removing signature failed w/ signtool', e);
  }
}

console.log('Injecting blob');
const seaPrepBlob = await fs.readFile('sea-prep.blob');
await inject(dest, 'NODE_SEA_BLOB', seaPrepBlob, {
  sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  machoSegmentName: 'NODE_SEA',
});

if (isDarwin) {
  console.log('Signing binary w/ codesign');
  execSync(`codesign --sign - ${dest}`);
} else if (isWindows) {
  try {
    console.log('Signing binary w/ signtool');
    execSync(`"${signToolPath}" sign /fd SHA256 ${dest}`);
  } catch (e) {
    console.warn('Signing failed w/ signtool', e);
  }
}

if (isDarwin || isLinux) {
  console.log('Setting exec permissions');
  execSync(`chmod +x ${dest}`);
}

console.log('Done');
