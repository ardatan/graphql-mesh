import http from 'http';

http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'applcation/json' });
    res.end(
      JSON.stringify({
        code: 'I am a secret code',
        timestamp: Date.now(),
      }),
    );
  })
  .listen(3001, 'localhost', () => {
    console.info(`Private API listening; http://localost:3001`);
  });
