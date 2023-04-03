/* eslint-disable import/no-nodejs-modules */
import { ClientHttp2Session, connect } from 'http2';
import { Readable } from 'stream';
import { MeshPlugin, MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { Response } from '@whatwg-node/fetch';

export default function useHTTP2(opts: MeshPluginOptions<YamlConfig.Http2Plugin>): MeshPlugin<any> {
  const sessionsByOrigin = new Map<string, ClientHttp2Session>();
  function getSessionByOrigin(origin: string) {
    let session = sessionsByOrigin.get(origin);
    if (!session) {
      session = connect(origin);
      sessionsByOrigin.set(origin, session);
    }
    return session;
  }
  opts.pubsub.subscribe('destroy', () => {
    for (const [, session] of sessionsByOrigin) {
      session.destroy();
    }
  });
  return {
    onFetch({ url, setFetchFn }) {
      const parsedUrl = new URL(url);
      const origin = parsedUrl.origin;
      if (opts.origins && !opts.origins.includes(origin)) {
        return;
      }
      setFetchFn(function fetchForOrigin(_url, options) {
        const session = getSessionByOrigin(origin);

        const stream = session.request(
          {
            ...getHeadersObj(options.headers),
            ':method': options.method,
            ':path': parsedUrl.pathname + parsedUrl.search,
          },
          {
            signal: options.signal,
          },
        );
        if (options.body) {
          Readable.from(options.body as any).pipe(stream);
        } else {
          stream.end();
        }
        return new Promise(resolve => {
          let status = 200;
          const responseHeaders: Record<string, any> = {};
          stream.once('response', headers => {
            for (const key in headers) {
              if (key === ':status') {
                status = headers[key];
              } else {
                responseHeaders[key] = headers[key];
              }
            }
            resolve(
              new Response(stream as any, {
                headers: responseHeaders,
                status,
              }),
            );
          });
        });
      });
    },
  };
}
