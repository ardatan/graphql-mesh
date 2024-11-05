import { fetch } from '@whatwg-node/fetch';

export const localHostnames = ['localhost', '127.0.0.1', '0.0.0.0'];

export async function getLocalHostName(port: number) {
  const timeoutSignal = AbortSignal.timeout(5000);
  while (!timeoutSignal.aborted) {
    for (const hostname of [...localHostnames]) {
      if (process.env.DEBUG) {
        console.log(`Trying hostname: ${hostname}`);
      }
      try {
        const res = await fetch(`http://${hostname}:${port}`, { signal: timeoutSignal });
        await res.text();
      } catch (err) {
        const errString = err.toString().toLowerCase();
        if (errString.includes('unsupported') || errString.includes('parse error')) {
          return hostname;
        }
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
    `No available hostname found as a local hostname for the given port: ${port}. Tried hostnames: ${localHostnames.join(', ')}`,
  );
}
