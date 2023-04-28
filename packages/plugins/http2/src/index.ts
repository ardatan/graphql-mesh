/* eslint-disable import/no-nodejs-modules */
import { ClientHttp2Session, connect } from 'http2';
import { Readable } from 'stream';
import { MeshPlugin, MeshPluginOptions } from '@graphql-mesh/types';
import { createLruCache, getHeadersObj } from '@graphql-mesh/utils';
import { Response } from '@whatwg-node/fetch';

export default function useHTTP2(opts: MeshPluginOptions<unknown>): MeshPlugin<any> {
  const sessionsByOrigin = createLruCache<ClientHttp2Session>();
  function getSessionByOrigin(origin: string) {
    let session = sessionsByOrigin.get(origin);
    if (!session) {
      session = connect(origin);
      sessionsByOrigin.set(origin, session);
    }
    return session;
  }
  opts.pubsub.subscribe('destroy', () => {
    sessionsByOrigin.keys().forEach(origin => {
      const session = sessionsByOrigin.get(origin);
      if (session) {
        session.destroy();
      }
    });
  });
  return {
    onFetch({ setFetchFn }) {
      setFetchFn(function fetchForOrigin(url, options) {
        const { origin, pathname, search } = new URL(url);
        const session = getSessionByOrigin(origin);

        const stream = session.request(
          {
            ...getHeadersObj(options.headers),
            ':method': options.method,
            ':path': pathname + search,
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
