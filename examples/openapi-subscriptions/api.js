const express = require('express');
const { fetch } = require('@whatwg-node/fetch');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/streams', async (req, res) => {
  const { callbackUrl } = req.body;
  setInterval(() => {
    const body = JSON.stringify({
      timestamp: new Date().toJSON(),
      userData: 'RANDOM_DATA',
    });
    console.info('Webhook ping -> ', callbackUrl, body);
    fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    }).catch(console.log);
  }, 1000);
  res.json({
    subscriptionId: Date.now().toString(),
  });
});

app.listen(4001, () => {
  console.info('API Server Listening on 4001');
});
