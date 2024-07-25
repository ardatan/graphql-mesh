// @ts-expect-error tsx will allow this to work
import { version } from '../package.json';

const split = process.argv[2] === '--split';

const [major, minor] = String(version).split('.');

if (split) {
  process.stdout.write(`${major},${major}.${minor},${version}`);
} else {
  process.stdout.write(version);
}
