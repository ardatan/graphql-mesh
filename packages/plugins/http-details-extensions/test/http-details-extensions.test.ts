import type { OnExecuteHookResult } from '@envelop/core';
import { Response } from '@whatwg-node/fetch';
import { wrapFetchWithPlugins } from '../../../legacy/runtime/src/get-mesh.js';
import useIncludeHttpDetailsInExtensions from '../src/index.js';

describe('HTTP Details Extensions', () => {
  it('should respect boolean `if`', () => {
    const plugin = useIncludeHttpDetailsInExtensions({
      if: false,
    });
    expect(plugin).toEqual({});
  });
  it('should respect negative interpolation string', async () => {
    const plugin = useIncludeHttpDetailsInExtensions({
      if: 'env.DEBUG === 1',
    });
    const fetch = wrapFetchWithPlugins([
      {
        onFetch({ setFetchFn }) {
          setFetchFn(async () => new Response('{"data": "test"}'));
        },
      },
      plugin,
    ]);
    const dummyCtx = {};
    await fetch('http://localhost:3000', {}, dummyCtx);
    const returnedObj = (await plugin.onExecute({
      args: { contextValue: dummyCtx },
    } as any)) as OnExecuteHookResult<any>;
    const dummyResult: any = {};
    const setResult = jest.fn();
    await returnedObj.onExecuteDone({
      result: dummyResult,
      setResult,
      args: { contextValue: dummyCtx },
    } as any);
    expect(setResult).toHaveBeenCalledTimes(0);
  });
  it('should respect positive interpolation string', async () => {
    const plugin = useIncludeHttpDetailsInExtensions({
      if: 'env.DEBUG == null',
    });
    const fetch = wrapFetchWithPlugins([
      {
        onFetch({ setFetchFn }) {
          setFetchFn(async () => new Response('{"data": "test"}'));
        },
      },
      plugin,
    ]);
    const dummyCtx = {};
    await fetch('http://localhost:3000', {}, dummyCtx);
    const returnedObj = (await plugin.onExecute({
      args: { contextValue: dummyCtx },
    } as any)) as OnExecuteHookResult<any>;
    const dummyResult: any = {};
    const setResult = jest.fn();
    await returnedObj.onExecuteDone({ result: dummyResult, setResult } as any);
    expect(setResult).toHaveBeenCalledTimes(1);
  });
});
