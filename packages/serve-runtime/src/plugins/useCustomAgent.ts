// eslint-disable-next-line import/no-nodejs-modules
import type { Agent as HttpAgent } from 'http';
// eslint-disable-next-line import/no-nodejs-modules
import type { Agent as HttpsAgent } from 'https';
import type { OnFetchHookPayload } from '@graphql-mesh/types';
import type { GatewayContext, GatewayPlugin } from '../types';

type AgentFactory<TContext> = (
  payload: OnFetchHookPayload<Partial<TContext> & GatewayContext & Record<string, any>>,
) => HttpAgent | HttpsAgent | false | undefined;

export function useCustomAgent<TContext>(
  agentFactory: AgentFactory<TContext>,
): GatewayPlugin<TContext> {
  return {
    onFetch(payload) {
      const agent = agentFactory(payload);
      if (agent != null) {
        payload.setOptions({
          ...payload.options,
          // @ts-expect-error - `agent` is there
          agent,
        });
      }
    },
  };
}
