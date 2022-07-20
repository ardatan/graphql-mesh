import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { Plugin } from '@graphql-yoga/common';
import lodashGet from 'lodash.get';

export default function useWebhook(opts: MeshPluginOptions<YamlConfig.WebhookPluginConfig>): Plugin {
  return {
    async onRequest({ request, serverContext, fetchAPI, endResponse }) {
      if (opts.method != null) {
        if (request.method !== opts.method) {
          return;
        }
      }
      if (request.url.endsWith(opts.path)) {
        let payload = await request.json();
        opts.logger.debug(`Payload received; `, payload);
        if (opts.payload != null) {
          payload = lodashGet(payload, opts.payload);
          opts.logger.debug([`Extracting ${opts.payload};`, payload]);
        }
        const interpolationData = {
          ...serverContext,
          payload,
        };
        opts.logger.debug(`Interpolating ${opts.pubsubTopic} with `, interpolationData);
        const pubsubTopic = stringInterpolator.parse(opts.pubsubTopic, interpolationData);
        opts.pubsub.publish(pubsubTopic, payload);
        opts.logger.debug(`Payload sent to ${pubsubTopic}`);
        endResponse(
          new fetchAPI.Response(null, {
            status: 204,
          })
        );
      }
    },
  };
}
