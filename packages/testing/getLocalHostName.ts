import { fetch } from '@whatwg-node/fetch';

export async function getLocalHostName(port: number) {
  const hostnames = ['localhost', '127.0.0.1', '0.0.0.0'];
  const timeoutSignal = AbortSignal.timeout(5000);
  while (!timeoutSignal.aborted) {
    for (const hostname of hostnames) {
      if (process.env.DEBUG) {
        console.log(`Trying hostname: ${hostname}`);
      }
      try {
        const res = await fetch(`http://${hostname}:${port}`, { signal: timeoutSignal });
        await res.text();
      } catch (e) {
        if (process.env.DEBUG) {
          console.log(`Failed to connect to hostname: ${hostname}`);
        }
        continue;
      }
      if (process.env.DEBUG) {
        console.log(`Found hostname: ${hostname}`);
      }
      return hostname;
    }
  }
  throw new Error(
    `No available hostname found as a local hostname for the given port: ${port}. Tried hostnames: ${hostnames.join(', ')}`,
  );
}
