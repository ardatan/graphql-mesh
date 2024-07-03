import { makeBehavior } from 'graphql-ws/lib/use/uWebSockets';
import type { ServerOptions } from './types.js';

export async function startuWebSocketsServer({
  handler,
  log,
  protocol,
  host,
  port,
  sslCredentials,
}: ServerOptions): Promise<Disposable> {
  return import('uWebSockets.js').then(uWS => {
    const app = sslCredentials ? uWS.SSLApp(sslCredentials) : uWS.App();

    // http
    app.any('/*', handler);

    // ws
    const behaviour = makeBehavior({
      execute: (args: any) => args.rootValue.execute(args),
      async subscribe(args: any) {
        const result = await args.rootValue.subscribe(args);
        if ('next' in result) {
          // is an async iterable, augment the next method to handle thrown errors
          const originalNext = result.next;
          result.next = async () => {
            try {
              return await originalNext();
            } catch (err) {
              // gracefully handle the error thrown from the next method
              return { value: { errors: [err] } };
            }
          };
        }
        return result;
      },
      async onSubscribe(ctx, msg) {
        const { schema, execute, subscribe, contextFactory, parse, validate } =
          handler.getEnveloped({
            ...ctx,
            request: ctx.extra.persistedRequest,
            params: msg.payload,
          });

        const args = {
          schema,
          operationName: msg.payload.operationName,
          document: parse(msg.payload.query),
          variableValues: msg.payload.variables,
          contextValue: await contextFactory(),
          rootValue: {
            execute,
            subscribe,
          },
        };

        const errors = validate(args.schema, args.document);
        if (errors.length) return errors;
        return args;
      },
    });
    app.ws(handler.graphqlEndpoint, behaviour);

    log.info(`Starting server on ${protocol}://${host}:${port}`);
    return new Promise((resolve, reject) => {
      app.listen(host, port, function listenCallback(listenSocket) {
        if (listenSocket) {
          resolve({
            [Symbol.dispose]() {
              log.info(`Closing ${protocol}://${host}:${port}`);
              app.close();
            },
          });
        } else {
          reject(new Error(`Failed to start server on ${protocol}://${host}:${port}!`));
        }
      });
    });
  });
}
