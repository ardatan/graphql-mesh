import { getPortArg, getTargetArg } from './args';

it.each([
  [['yarn', 'mesh-serve'], { port: null, target: null }],
  [['yarn', 'mesh-serve', '--port=50000'], { port: 50000, target: null }],
  [['yarn', 'mesh-compose', '--target=output.graphql'], { port: null, target: 'output.graphql' }],
  [
    ['yarn', 'mesh-serve-compose', '--port=50000', '--target=output.graphql'],
    { port: 50000, target: 'output.graphql' },
  ],
])('should parse tenv args %p to %p', (input, { port, target }) => {
  expect(getPortArg(input)).toEqual(port);
  expect(getTargetArg(input)).toEqual(target);
});
