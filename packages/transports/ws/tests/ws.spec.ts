import { parse } from 'graphql';
import type {
  TransportEntry,
  TransportGetSubgraphExecutorOptions,
} from '@graphql-mesh/transport-common';
import { DefaultLogger, dispose, makeAsyncDisposable, makeDisposable } from '@graphql-mesh/utils';
import { buildGraphQLWSExecutor } from '@graphql-tools/executor-graphql-ws';
import wsTransport, { type WSTransportOptions } from '../src';

jest.mock('@graphql-tools/executor-graphql-ws', () => ({
  buildGraphQLWSExecutor: jest.fn(() => mockWsExecutor),
}));

const mockWsExecutor = jest.fn(() => ({ data: null }));
const buildExecutorMock = jest.mocked(buildGraphQLWSExecutor);

describe('HTTP Transport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should forward connection params', async () => {
    const executor = makeExecutor({
      options: {
        connectionParams: { 'x-test': '{context.token}' },
      },
    });

    await executor({ document, context: { token: 'test' } });

    expect(buildExecutorMock).toHaveBeenCalledTimes(1);
    expect(buildExecutorMock.mock.calls[0][0]).toMatchObject({
      connectionParams: { 'x-test': 'test' },
    });
  });

  it('should forward headers', async () => {
    const executor = makeExecutor({
      headers: [['x-test', '{context.token}']],
    });

    await executor({ document, context: { token: 'test' } });

    expect(buildExecutorMock).toHaveBeenCalledTimes(1);
    expect(buildExecutorMock.mock.calls[0][0]).toMatchObject({
      headers: { 'x-test': 'test' },
    });
  });

  it('should reuse websocket executor based on connection params and headers', async () => {
    const executor = makeExecutor({
      options: {
        connectionParams: {
          token: '{context.token}',
        },
      },
    });

    await executor({ document, context: { token: 'test1' } });

    await executor({ document, context: { token: 'test2' } });

    await executor({ document, context: { token: 'test2' } });

    expect(buildExecutorMock).toHaveBeenCalledTimes(2);
  });

  it('should reuse websocket executor based on headers', async () => {
    const executor = makeExecutor({
      headers: [['x-test', '{context.token}']],
    });

    await executor({ document, context: { token: 'test1' } });

    await executor({ document, context: { token: 'test2' } });

    await executor({ document, context: { token: 'test2' } });

    expect(buildExecutorMock).toHaveBeenCalledTimes(2);
  });

  it('should reuse websocket executor based on both headers and connectionParams', async () => {
    const executor = makeExecutor({
      headers: [['x-test', '{context.headers}']],
      options: {
        connectionParams: {
          test: '{context.connectionParams}',
        },
      },
    });

    await executor({ document, context: { connectionParams: 'test1', headers: 'test1' } });

    await executor({ document, context: { connectionParams: 'test2', headers: 'test1' } });

    await executor({ document, context: { connectionParams: 'test1', headers: 'test2' } });

    await executor({ document, context: { connectionParams: 'test2', headers: 'test2' } });

    await executor({ document, context: { connectionParams: 'test1', headers: 'test1' } });

    expect(buildExecutorMock).toHaveBeenCalledTimes(4);
  });

  it('should cleanup executors on connection closed', async () => {
    const executor = makeExecutor();

    await executor({ document });
    // @ts-ignore
    buildExecutorMock.mock.lastCall[0].on.closed();
    await executor({ document });

    expect(buildExecutorMock).toHaveBeenCalledTimes(2);
  });

  it('should dispose all executors', async () => {
    const executor = makeExecutor({
      options: { connectionParams: { test: '{context.test}' } },
    });

    const disposeMock = jest.fn();
    buildExecutorMock.mockImplementationOnce(() => makeDisposable(jest.fn(), disposeMock));
    await executor({ document, context: { test: '1' } });

    const asyncDisposeMock = jest.fn().mockReturnValue(Promise.resolve());
    buildExecutorMock.mockImplementationOnce(() =>
      makeAsyncDisposable(jest.fn(), asyncDisposeMock),
    );
    await executor({ document, context: { test: '2' } });

    await dispose(executor);

    expect(disposeMock).toHaveBeenCalled();
    expect(asyncDisposeMock).toHaveBeenCalled();
  });
});

function makeExecutor(transportEntry?: Partial<TransportEntry<WSTransportOptions>>) {
  return wsTransport.getSubgraphExecutor({
    transportEntry: {
      location: '/ws',
      ...transportEntry,
    },
    logger: new DefaultLogger(),
  } as unknown as TransportGetSubgraphExecutorOptions<WSTransportOptions>);
}

const document = parse(/* GraphQL */ `
  subscription {
    test
  }
`);
