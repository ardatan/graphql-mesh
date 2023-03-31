// withCookies - embeds cookies object into the request
export const withCookies = (request: Request & { cookies?: Record<string, string> }) => {
  request.cookies = {};
  try {
    request.cookies = (request.headers.get('Cookie') || '')
      .split(/;\s*/)
      .map(pair => pair.split(/=(.+)/))
      .reduce((acc: any, [key, value]) => {
        acc[key] = value;

        return acc;
      }, {});
  } catch (err) {}
};
