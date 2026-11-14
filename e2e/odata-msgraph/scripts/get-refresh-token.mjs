#!/usr/bin/env node
/**
 * One-shot helper: device-code login → print refresh_token for GitHub Actions secrets.
 *
 * Usage:
 *   MSGRAPH_TENANT_ID=… MSGRAPH_CLIENT_ID=… node e2e/odata-msgraph/scripts/get-refresh-token.mjs
 *
 * App registration must allow public client flows (or supply MSGRAPH_CLIENT_SECRET).
 * Delegated permissions + admin consent: User.Read, Mail.Read, Group.Read.All,
 * Files.Read, offline_access.
 */
const tenant = process.env.MSGRAPH_TENANT_ID || 'common';
const clientId = process.env.MSGRAPH_CLIENT_ID;
const clientSecret = process.env.MSGRAPH_CLIENT_SECRET;
const scope =
  process.env.MSGRAPH_SCOPE ||
  'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Group.Read.All https://graph.microsoft.com/Files.Read offline_access';

if (!clientId) {
  console.error('Set MSGRAPH_CLIENT_ID (and usually MSGRAPH_TENANT_ID).');
  process.exit(1);
}

const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
const deviceUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/devicecode`;

const form = obj =>
  Object.entries(obj)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

const device = await fetch(deviceUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: form({ client_id: clientId, scope }),
}).then(r => r.json());

if (!device.device_code) {
  console.error('Device code request failed:', device);
  process.exit(1);
}

console.log(`\nOpen ${device.verification_uri} and enter code: ${device.user_code}\n`);
console.log('(waiting for you to sign in…)\n');

const intervalMs = Math.max(3, Number(device.interval) || 5) * 1000;
const deadline = Date.now() + (Number(device.expires_in) || 900) * 1000;

while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, intervalMs));
  const body = {
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    client_id: clientId,
    device_code: device.device_code,
  };
  if (clientSecret) body.client_secret = clientSecret;
  const token = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form(body),
  }).then(r => r.json());

  if (token.access_token && token.refresh_token) {
    console.log('--- add these as GitHub Actions repository secrets ---');
    console.log(`MSGRAPH_TENANT_ID=${tenant === 'common' ? '<your-tenant-id>' : tenant}`);
    console.log(`MSGRAPH_CLIENT_ID=${clientId}`);
    if (clientSecret) console.log('MSGRAPH_CLIENT_SECRET=<your-client-secret>');
    console.log(`MSGRAPH_REFRESH_TOKEN=${token.refresh_token}`);
    console.log('-------------------------------------------------------');
    console.log('\nAccess token (optional local smoke, expires ~1h):');
    console.log(token.access_token);
    process.exit(0);
  }
  if (token.error === 'authorization_pending') continue;
  if (token.error === 'slow_down') {
    await new Promise(r => setTimeout(r, intervalMs));
    continue;
  }
  console.error('Token poll failed:', token);
  process.exit(1);
}

console.error('Timed out waiting for device login.');
process.exit(1);
