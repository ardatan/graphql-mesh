import { createServer } from 'http';
import { createRouter, Response } from 'fets';
import urljoin from 'url-join';
import { Opts } from '@e2e/opts';
import { fetch } from '@whatwg-node/fetch';

const app = createRouter<FetchEvent>().route({
  method: 'POST',
  path: '/streams',
  handler(req, { waitUntil }) {
    const subscriptionId = Date.now().toString();
    waitUntil(
      req.json().then(async ({ callbackUrl }) => {
        for (let i = 0; i < 10; i++) {
          const body = JSON.stringify({
            timestamp: new Date().toJSON(),
            userData: 'RANDOM_DATA',
          });
          const fullCallbackUrl = urljoin(callbackUrl, subscriptionId);
          console.info(`Webhook ping ${i + 1} out of 10 -> `, fullCallbackUrl, body);
          await fetch(fullCallbackUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body,
          })
            .then(res => {
              console.info(`Webhook response ${i + 1} -> `, res.status, res.statusText);
            })
            .catch(err => console.error(`Webhook error ${i + 1} -> `, err));
        }
      }),
    );
    return Response.json({ subscriptionId });
  },
});

const port = Opts(process.argv).getServicePort('api', true);

createServer(app).listen(port, () => {
  console.log(`API service listening on http://localhost:${port}`);
});
