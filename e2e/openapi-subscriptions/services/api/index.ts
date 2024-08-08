import { createServer } from 'http';
import { createRouter, Response } from 'fets';
import urljoin from 'url-join';
import { Opts } from '@e2e/opts';
import { fetch } from '@whatwg-node/fetch';

const app = createRouter().route({
  method: 'POST',
  path: '/streams',
  handler(req) {
    const subscriptionId = Date.now().toString();
    req.json().then(async ({ callbackUrl }) => {
      for (let i = 0; i < 10; i++) {
        const body = JSON.stringify({
          timestamp: new Date().toJSON(),
          userData: 'RANDOM_DATA',
        });
        const fullCallbackUrl = urljoin(callbackUrl, subscriptionId);
        console.info(`Webhook ping ${i + 1} out of 10 -> `, fullCallbackUrl, body);
        const res = await fetch(fullCallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body,
        });
        console.info(`Webhook response ${i + 1} -> `, res.status, res.statusText);
      }
    });
    return Response.json({ subscriptionId });
  },
});

const port = Opts(process.argv).getServicePort('api', true);

createServer(app).listen(port, () => {
  console.log(`API service listening on http://localhost:${port}`);
});
