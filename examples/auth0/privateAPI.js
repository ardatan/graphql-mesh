const http = require('http');

http
  .createServer((req, res) => {
    if (req.headers['x-auth-sub']) {
      res.writeHead(200, { 'Content-Type': 'applcation/json' });
      res.end(
        JSON.stringify({
          code: req.headers['x-auth-sub'] + 's code',
        })
      );
    } else {
      res.writeHead(401, { 'Content-Type': 'applcation/json' });
      res.end(
        JSON.stringify({
          errorMessage: 'You need an Auth0 sub to continue!',
        })
      );
    }
  })
  .listen(3001, 'localhost', () => {
    console.info(`Private API listening; http://localost:4001`);
  });
