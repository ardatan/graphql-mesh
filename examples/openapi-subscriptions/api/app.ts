import { createRouter, Response } from 'fets';
import urljoin from 'url-join';
import { fetch as defaultFetch } from '@whatwg-node/fetch';

export function createApp(fetch = defaultFetch) {
  const intervals = new Set<NodeJS.Timeout>();

  const app = createRouter().route({
    method: 'POST',
    path: '/streams',
    handler(req) {
      const subscriptionId = Date.now().toString();
      req.json().then(({ callbackUrl }) => {
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
          })
            .then(res => {
              console.info('Webhook response -> ', res.status, res.statusText);
            })
            .catch(err => {
              console.error('Webhook error -> ', err);
            });
        }, 200);
        intervals.add(interval);
      });
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
