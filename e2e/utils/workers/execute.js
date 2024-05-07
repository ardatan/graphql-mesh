import { expose } from 'threads/worker';

expose(async function (port, args) {
  const res = await fetch(`http://0.0.0.0:${port}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/graphql-response+json, application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const err = new Error(`${res.status} ${res.statusText}\n${await res.text()}`);
    err.name = 'ResponseError';
    throw err;
  }
  const result = await res.json();
  if (result.errors?.length) {
    throw new Error(`GraphQL result has errors\n${JSON.stringify(result.errors)}`);
  }
  return result;
});
