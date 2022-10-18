import express from 'express';
import { fetch } from '@whatwg-node/fetch';
import urljoin from 'url-join';

export const app = express();
app.use(express.json());

app.post('/streams', async (req, res) => {
  const { callbackUrl } = req.body;
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
  app.once('destroy', () => {
    clearInterval(interval);
  });
  res.json({
    subscriptionId,
  });
});
