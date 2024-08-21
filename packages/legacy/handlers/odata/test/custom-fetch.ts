export let mocks: Record<string, (req: Request) => Promise<Response>> = {};
export const Headers = Map;
export const MockRequest = function (url: string, config: RequestInit) {
  return {
    url,
    ...config,
    // TODO: Arda - replace any with strict type
    text: async () => (config.body as any).toString('utf-8'),
    json: async () => JSON.parse((config.body as any).toString('utf-8')),
    clone() {
      return this;
    },
  } as Request;
} as any as typeof Request;
export const MockResponse = function (body: any) {
  return {
    text: async () => body.toString('utf-8'),
    json: async () => JSON.parse(body.toString('utf-8')),
  } as Response;
} as any as typeof Response;

export function addMock(url: string, responseFn: (request: Request) => Promise<Response>) {
  mocks[url] = responseFn;
}

export function resetMocks() {
  mocks = {};
}

export const mockFetch = function (...args: Parameters<WindowOrWorkerGlobalScope['fetch']>) {
  let request: Request;
  if (typeof args[0] === 'string') {
    request = new MockRequest(...args);
  } else {
    request = args[0] as Request;
  }
  const url = decodeURIComponent(request.url);
  const responseFn = mocks[url];
  if (!responseFn) {
    throw new Error(`${url} isn't mocked!;\n available mocks: ${Object.keys(mocks).join(',\n')}`);
  }
  return responseFn(request);
} as any as WindowOrWorkerGlobalScope['fetch'];
