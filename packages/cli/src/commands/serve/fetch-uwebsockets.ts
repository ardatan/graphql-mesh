/* eslint-disable import/no-nodejs-modules */
import { Readable } from 'stream';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';
import { MeshHTTPHandler } from '@graphql-mesh/http';

interface ServerContext {
  req: HttpRequest;
  res: HttpResponse;
}

export function getUwebsocketsHandlerForFetch({
  fetchFn,
  protocol,
  hostname,
  port,
}: {
  fetchFn: MeshHTTPHandler<ServerContext>['fetch'];
  protocol: 'http' | 'https';
  hostname: string;
  port: number;
}) {
  return async function fetchUwebsocketsHandler(res: HttpResponse, req: HttpRequest) {
    let body: any;
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
        body.push(Buffer.from(chunk));
        if (isLast) {
          body.push(null);
        }
      });
    }
    const headers: Record<string, string> = {};
    req.forEach((key, value) => {
      headers[key] = value;
    });
    const response = await fetchFn(
      `${protocol}://${hostname}:${port}${req.getUrl()}`,
      {
        method,
        headers,
        body,
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
    response.headers.forEach((value, key) => {
      // content-length causes an error with Node.js's fetch
      if (key === 'content-length') {
        return;
      }
      res.writeHeader(key, value);
    });
    if (response.body) {
      if (response.body instanceof Uint8Array) {
        res.end(response.body);
        return;
      }
      for await (const chunk of response.body) {
        res.write(chunk);
      }
    }
    res.end();
  };
}
