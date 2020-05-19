import { request as httpRequest, RequestOptions as HTTPRequestOptions } from 'http';
import { request as httpsRequest, RequestOptions as HTTPSRequestOptions } from 'https';
import { Request, Response } from 'fetchache';

export function nativeFetch(request: Request): Promise<Response> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(request.url);

    const headersObj: Record<string, string> = {};
    request.headers.forEach((val, key) => {
      headersObj[key] = val;
    });

    const requestOptions: HTTPRequestOptions | HTTPSRequestOptions = {
      method: request.method,
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      headers: headersObj,
    };

    const httpOrHttpsRequest = urlObj.protocol === 'https:' ? httpsRequest : httpRequest;
    const nativeRequest = httpOrHttpsRequest(requestOptions, res => {
      const location = res.headers.location;
      if (location) {
        nativeFetch(
          new Request(`${urlObj.protocol}//${urlObj.hostname}${location}`, {
            method: request.method,
            headers: request.headers,
            body: request.body,
          })
        )
          .then(resolve)
          .catch(reject);
        return;
      }
      const chunks: any[] = [];

      res.on('data', chunk => chunks.push(chunk));

      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve(
          new Response(body.toString(), {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers as Record<string, string>,
          })
        );
      });

      res.on('error', error => reject(error));
    });
    if (request.body) {
      request.text().then(requestData => {
        nativeRequest.write(requestData);

        nativeRequest.end();
      });
    } else {
      nativeRequest.end();
    }
  });
}
