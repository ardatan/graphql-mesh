import { createServer } from 'node:http';

export default createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      authorization: req.headers.authorization,
      url: req.url,
    }),
  );
}).listen(8515, () => {
  console.log('Server is running on http://localhost:8515');
});
