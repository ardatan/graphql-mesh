import { createTenv } from '@e2e/tenv';

const { serve, compose } = createTenv(__dirname);

it('should write serve logs to stderr', async () => {
  const { getStd, dispose } = await serve();
  await dispose();

  expect(getStd('out')).toBeFalsy();
  expect(getStd('err')).toContain('Started server on');
});

it('should write compose output to stdout and logs to stderr', async () => {
  const { getStd } = await compose();

  expect(getStd('out')).toMatchSnapshot();
  expect(getStd('err')).toMatchSnapshot();
});
