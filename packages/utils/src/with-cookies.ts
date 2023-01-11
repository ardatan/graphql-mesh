import type { RouterRequest } from '@whatwg-node/router';

// withCookies - embeds cookies object into the request
export const withCookies = (request: RouterRequest & { cookies?: Record<string, string> }) => {
  request.cookies = {};
  try {
    request.cookies = (request.headers.get('Cookie') || '')
      .split(/;\s*/)
      .map(pair => pair.split(/=(.+)/))
      .reduce((acc, [key, value]) => {
        acc[key] = value;

        return acc;
      }, {});
  } catch (err) {}
};
