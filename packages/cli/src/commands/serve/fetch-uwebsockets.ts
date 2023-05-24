/* eslint-disable import/no-nodejs-modules */
import { Readable } from 'stream';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';
import { MeshHTTPHandler } from '@graphql-mesh/http';
import { pipeStreamOverResponse } from './pipeStreamOverResponse.js';

export function getUwebsocketsHandlerForFetch({
  fetchFn,
  protocol,
  hostname,
  port,
}: {
  fetchFn: MeshHTTPHandler['fetch'];
  protocol: 'http' | 'https';
  hostname: string;
  port: number;
}) {
  return async function fetchUwebsocketsHandler(res: HttpResponse, req: HttpRequest) {
    let body: Readable;
    const method = req.getMethod();
    let resAborted = false;
    res.onAborted(function () {
      resAborted = true;
      body?.push(null);
    });
    if (method !== 'get' && method !== 'head') {
      body = new Readable({
        read() {},
      });
      res.onData(function (chunk, isLast) {
        body.push(Buffer.from(chunk, 0, chunk.byteLength));
        if (isLast) {
          body.push(null);
        }
      });
    }
    const headers: Record<string, string> = {};
    req.forEach((key, value) => {
      headers[key] = value;
    });
    const url = `${protocol}://${hostname}:${port}${req.getUrl()}`;
    const response = await fetchFn(
      url,
      {
        method,
        headers,
        body: body as any,
      },
      {
        req,
        res,
      },
    );
    if (resAborted) {
      return;
    }
    res.writeStatus(`${response.status} ${response.statusText}`);
    let totalSize = 0;
    response.headers.forEach((value, key) => {
      // content-length causes an error with Node.js's fetch
      if (key === 'content-length') {
        totalSize = parseInt(value);
      }
      res.writeHeader(key, value);
    });
    if (!response.body) {
      res.end();
      return;
    }
    if ((response as any).bodyType === 'String' || (response as any).bodyType === 'Uint8Array') {
      res.end((response as any).bodyInit);
      return;
    }
    return pipeStreamOverResponse(res, response.body as any, totalSize);
  };
}
