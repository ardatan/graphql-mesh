/* eslint-disable no-async-promise-executor */
import { Request, Response } from 'cross-fetch';
import { request as undiciRequest } from 'undici';

export async function nativeFetch(request: Request): Promise<Response> {
  const urlObj = new URL(request.url);

  const headersObj: Record<string, string> = {};
  request.headers.forEach((val, key) => {
    headersObj[key] = val;
  });

  const res = await undiciRequest(urlObj, {
    method: request.method,
    headers: headersObj,
    body: request.body as any,
  });

  if (res.headers.location) {
    return nativeFetch(
      new Request(`${urlObj.protocol}//${urlObj.hostname}${location}`, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      })
    );
  }

  return new Response(res.body as any, {
    status: res.statusCode,
    headers: res.headers as Record<string, string>,
  });
}
