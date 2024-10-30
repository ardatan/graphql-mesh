import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { URL } from '@whatwg-node/fetch';
import type { MySQLSSLOptions } from './types.js';

export function getConnectionOptsFromEndpointUri(endpointUri: string) {
  endpointUri = stringInterpolator.parse(endpointUri, {
    env: process.env,
  });
  const {
    username: user,
    password,
    protocol = 'mysql:',
    hostname: host = 'localhost',
    port = '3306',
    pathname: databasePath = '/mysql',
    searchParams,
  } = new URL(endpointUri);
  const additionalOptions: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    additionalOptions[key] = value;
  });
  const database = databasePath.slice(1);
  let sslOpts: MySQLSSLOptions | undefined;
  if (protocol === 'mysqls:') {
    sslOpts = {
      rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '1',
    };
  }
  return {
    user,
    password,
    protocol,
    host,
    port: parseInt(port, 10),
    database,
    trace: !!process.env.DEBUG,
    debug: !!process.env.DEBUG,
    ssl: sslOpts,
    ...additionalOptions,
  };
}
