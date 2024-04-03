import { Args, createArg } from './args';

it.each([
  {
    key: 'target',
    val: 'internet',
    out: '--target=internet',
  },
  {
    key: 'port',
    val: 12345,
    out: '--port=12345',
  },
])('should create $out from $key:$val', ({ key, val, out }) => {
  expect(createArg(key, val)).toBe(out);
});

it.each([
  {
    key: 'key space',
    val: 'internet',
  },
  {
    key: 'port',
    val: 'val space',
  },
])('should throw while creating "$val" for "$val"', ({ key, val }) => {
  expect(() => createArg(key, val)).toThrow();
});

it.each([
  {
    argv: ['yarn', 'mesh', createArg('target', 'internet')],
    key: 'target',
    val: 'internet',
  },
])('should get str "$val" by "$key" from $argv', ({ argv, key, val }) => {
  expect(Args(argv).get(key)).toBe(val);
});

it.each([
  {
    argv: ['yarn', 'mesh', createArg('port', 5000)],
    key: 'port',
    val: 5000,
  },
])('should get int $val by "$key" from $argv', ({ argv, key, val }) => {
  expect(Args(argv).getInt(key)).toBe(val);
});

it.each([
  {
    argv: ['yarn', 'mesh'],
    key: 'target',
  },
])('should get undefined by "$key" from $argv', ({ argv, key }) => {
  expect(Args(argv).get(key)).toBeUndefined();
});

it.each([
  {
    argv: ['yarn', 'mesh'],
    key: 'target',
  },
  {
    argv: ['yarn', 'mesh', '--target space=internet'],
    key: 'target space',
  },
])('should throw when requiring "$key" from $argv', ({ argv, key }) => {
  expect(() => Args(argv).get(key, true)).toThrow();
});
