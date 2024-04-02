import { createTenv } from '../tenv';

const { serve, compose } = createTenv(__dirname);

it('should write serve logs to stderr', async () => {
  const proc = await serve(55001);
  proc.kill();
  await proc.waitForExit;

  expect(proc.getStd('out')).toBeFalsy();
  expect(proc.getStd('err')).toContain('Started server on');
});

it('should write compose output to stdout and logs to stderr', async () => {
  const proc = await compose();
  await proc.waitForExit;

  expect(proc.getStd('out')).toMatchSnapshot();
  expect(proc.getStd('err')).toMatchSnapshot();
});
