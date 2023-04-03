import urljoin from 'url-join';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import { createRouter, Response } from '@whatwg-node/router';

export function createApp(fetch = defaultFetch) {
  const app = createRouter();

  const intervals = new Set<NodeJS.Timeout>();
  app.post('/streams', async req => {
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
    return new Response(JSON.stringify({ subscriptionId }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  return {
    app,
    dispose() {
      intervals.forEach(interval => clearInterval(interval));
    },
  };
}
