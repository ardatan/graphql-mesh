import { removeClosedBrackets } from '../src/sanitize-name-for-graphql.js';

it.each([
  { input: 'foo(bar)q', output: 'foobarq' },
  { input: 'foo(bar)q(bar)', output: 'foobarqbar' },
  { input: 'foo(bar)qux(', output: 'foobarqux(' },
  { input: 'foo(bar)(bar)qux(', output: 'foobarbarqux(' },
  { input: 'foo(bar)qu(x(', output: 'foobarqu(x(' },
  { input: 'foo(bar)qu(x)', output: 'foobarqux' },
  { input: 'foo((bar))qu(x)', output: 'foobarqux' },
  { input: 'foo((b(a)r))qu(x)', output: 'foobarqux' },
])('should remove closed brackets', ({ input, output }) => {
  expect(removeClosedBrackets(input)).toBe(output);
});
