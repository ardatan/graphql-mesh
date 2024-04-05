/* eslint-disable import/no-extraneous-dependencies */
import { Plugin } from 'graphql-yoga';
import { Logger, MeshPubSub } from '@graphql-mesh/types';

// TODO: Use Yoga PubSub later
export interface MeshWebhooksPluginOptions {
  pubsub?: MeshPubSub;
  logger: Logger;
}
export function useWebhooks({ pubsub, logger }: MeshWebhooksPluginOptions): Plugin {
  if (!pubsub) {
    throw new Error(`You must provide a pubsub instance to useWebhooks plugin!
    Example:
      export const serveConfig: MeshServeCLIConfig = {
        pubsub: new PubSub(),
        plugins: ctx => [
          useWebhooks(ctx),
        ],
      }
    See documentation: https://the-guild.dev/docs/mesh/pubsub`);
  }
  return {
    onRequest({ request, url, endResponse, fetchAPI }): void | Promise<void> {
      for (const eventName of pubsub.getEventNames()) {
        if (eventName === `webhook:${request.method.toLowerCase()}:${url.pathname}`) {
          return request.text().then(body => {
            logger?.debug(`Received webhook request for ${url.pathname}`, body);
            pubsub.publish(
              eventName,
              request.headers.get('content-type') === 'application/json' ? JSON.parse(body) : body,
            );
            endResponse(
              new fetchAPI.Response(null, {
                status: 204,
                statusText: 'OK',
              }),
            );
          });
        }
      }
    },
  };
}
