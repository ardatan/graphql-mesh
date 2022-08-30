const express = require('express');
const { fetch } = require('@whatwg-node/fetch');
const bodyParser = require('body-parser');
const urljoin = require('url-join');

const app = express();
app.use(bodyParser.json());

app.post('/streams', async (req, res) => {
  const { callbackUrl } = req.body;
  const subscriptionId = Date.now().toString();
  setInterval(() => {
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
  }, 1000);
  res.json({
    subscriptionId,
  });
});

app.listen(4001, () => {
  console.info('API Server Listening on 4001');
});
