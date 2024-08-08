import { createOpt, createPortOpt, createServicePortOpt, Opts } from './opts';

it.each([
  {
    key: 'output',
    val: 'internet',
    out: '--output=internet',
  },
  {
    key: 'port',
    val: 12345,
    out: '--port=12345',
  },
])('should create $out from $key:$val', ({ key, val, out }) => {
  expect(createOpt(key, val)).toBe(out);
});

it.each([
  {
    val: 5000,
    out: '--port=5000',
  },
])('should create port arg $out with $val', ({ val, out }) => {
  expect(createPortOpt(val)).toBe(out);
});

it.each([
  {
    name: 'john',
    val: 5000,
    out: '--john_port=5000',
  },
  {
    name: 'books',
    val: 5001,
    out: '--books_port=5001',
  },
])('should create subgraph port arg $out for $name with $val', ({ name, val, out }) => {
  expect(createServicePortOpt(name, val)).toBe(out);
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
  expect(() => createOpt(key, val)).toThrow();
});

it.each([
  {
    argv: ['yarn', 'mesh', createOpt('output', 'internet')],
    key: 'output',
    val: 'internet',
  },
])('should get str "$val" by "$key" from $argv', ({ argv, key, val }) => {
  expect(Opts(argv).get(key)).toBe(val);
});

it.each([
  {
    argv: ['yarn', 'mesh', createPortOpt(5000)],
    val: 5000,
  },
])('should get port $val from $argv', ({ argv, val }) => {
  expect(Opts(argv).getPort()).toBe(val);
});

it.each([
  {
    argv: ['yarn', 'mesh'],
    key: 'output',
  },
])('should get undefined by "$key" from $argv', ({ argv, key }) => {
  expect(Opts(argv).get(key)).toBeUndefined();
});

it.each([
  {
    argv: ['yarn', 'mesh'],
    key: 'output',
  },
  {
    argv: ['yarn', 'mesh', '--output space=internet'],
    key: 'output space',
  },
])('should throw when requiring "$key" from $argv', ({ argv, key }) => {
  expect(() => Opts(argv).get(key, true)).toThrow();
});
