import type { GraphQLResolveInfo } from 'graphql';
import { createServerAdapter, Response } from '@whatwg-node/server';
import { wrapFetchWithHooks, type FetchInstrumentation } from '../src/wrapFetchWithHooks';

describe('Fetch instrumentation', () => {
  it('should wrap fetch instrumentation', async () => {
    await using adapter = createServerAdapter(() => Response.json({ hello: 'world' }));
    let receivedExecutionRequest;
    const fetchInstrumentation: FetchInstrumentation = {
      fetch: async ({ executionRequest }, wrapped) => {
        receivedExecutionRequest = executionRequest;
        await wrapped();
      },
    };
    const wrappedFetch = wrapFetchWithHooks(
      [
        ({ setFetchFn }) => {
          setFetchFn(adapter.fetch);
        },
      ],
      () => fetchInstrumentation,
    );
    const executionRequest = {};
    const res = await wrappedFetch('http://localhost:4000', {}, {}, {
      executionRequest,
    } as GraphQLResolveInfo);
    expect(await res.json()).toEqual({ hello: 'world' });
    expect(receivedExecutionRequest).toBe(executionRequest);
  });
  it('should call onFetchDone when onFetch ends with response early', async () => {
    const onFetchDoneFn = jest.fn();
    const early = new Response('Early response');
    const wrappedFetch = wrapFetchWithHooks([
      ({ endResponse }) => {
        endResponse(early);
        return onFetchDoneFn;
      },
    ]);
    await wrappedFetch('http://localhost:4000');
    expect(onFetchDoneFn).toHaveBeenCalledWith(expect.objectContaining({ response: early }));
  });
});
