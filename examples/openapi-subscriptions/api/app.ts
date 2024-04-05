import { createRouter, Response } from 'fets';
import urljoin from 'url-join';
import { fetch as defaultFetch } from '@whatwg-node/fetch';

export function createApp(fetch = defaultFetch) {
  const intervals = new Set<NodeJS.Timeout>();

  const app = createRouter().route({
    method: 'POST',
    path: '/streams',
    async handler(req) {
      const { callbackUrl } = await req.json();
      const subscriptionId = Date.now().toString();
      const interval = setInterval(() => {
        const body = JSON.stringify({
          timestamp: new Date().toJSON(),
          userData: 'RANDOM_DATA',
        });
        const fullCallbackUrl = urljoin(callbackUrl, subscriptionId);
        console.info('Webhook ping -> ', fullCallbackUrl, body);
        fetch(fullCallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body,
        }).catch(console.log);
      }, 200);
      intervals.add(interval);
      return Response.json({ subscriptionId });
    },
  });

  return {
    app,
    dispose() {
      intervals.forEach(interval => clearInterval(interval));
    },
  };
}
