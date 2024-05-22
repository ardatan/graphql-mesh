// eslint-disable-next-line import/no-nodejs-modules
import { promises as fsPromises } from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import { createServer as createHTTPServer } from 'http';
// eslint-disable-next-line import/no-nodejs-modules
import { createServer as createHTTPSServer } from 'https';
// eslint-disable-next-line import/no-nodejs-modules
import { SecureContextOptions } from 'tls';
import { RecognizedString } from 'uWebSockets.js';
import { registerTerminateHandler } from '@graphql-mesh/utils';
import { ServerOptions } from './types.js';

export function readRecognizedString(recognizedString: RecognizedString) {
  if (typeof recognizedString === 'string') {
    return recognizedString;
  }
  if (Buffer.isBuffer(recognizedString)) {
    return recognizedString.toString('utf-8');
  }
  return Buffer.from(recognizedString).toString('utf-8');
}

export async function startNodeHttpServer({
  handler,
  log,
  protocol,
  host,
  port,
  sslCredentials,
}: ServerOptions): Promise<void> {
  if (sslCredentials) {
    const sslOptionsForNodeHttp: SecureContextOptions = {};
    if (sslCredentials.ca_file_name) {
      const caFileName = readRecognizedString(sslCredentials.ca_file_name);
      sslOptionsForNodeHttp.ca = await fsPromises.readFile(caFileName);
    }
    if (sslCredentials.cert_file_name) {
      const certFileName = readRecognizedString(sslCredentials.cert_file_name);
      sslOptionsForNodeHttp.cert = await fsPromises.readFile(certFileName);
    }
    if (sslCredentials.dh_params_file_name) {
      const dhParamsFileName = readRecognizedString(sslCredentials.dh_params_file_name);
      sslOptionsForNodeHttp.dhparam = await fsPromises.readFile(dhParamsFileName);
    }
    if (sslCredentials.key_file_name) {
      const keyFileName = readRecognizedString(sslCredentials.key_file_name);
      sslOptionsForNodeHttp.key = await fsPromises.readFile(keyFileName);
    }
    if (sslCredentials.passphrase) {
      const passphrase = readRecognizedString(sslCredentials.passphrase);
      sslOptionsForNodeHttp.passphrase = passphrase;
    }
    if (sslCredentials.ssl_ciphers) {
      const sslCiphers = readRecognizedString(sslCredentials.ssl_ciphers);
      sslOptionsForNodeHttp.ciphers = sslCiphers;
    }
    if (sslCredentials.ssl_prefer_low_memory_usage) {
      sslOptionsForNodeHttp.honorCipherOrder = true;
    }
    const server = createHTTPSServer(sslOptionsForNodeHttp, handler);
    log.info(`Starting server on ${protocol}://${host}:${port}`);
    return new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, () => {
        log.info(`Server started on ${protocol}://${host}:${port}`);
        registerTerminateHandler(eventName => {
          log.info(`Closing server for ${eventName}`);
          server.close(() => {
            log.info(`Server closed for ${eventName}`);
            resolve();
          });
        });
      });
    });
  }
  const server = createHTTPServer(handler);
  log.info(`Starting server on ${protocol}://${host}:${port}`);
  return new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      log.info(`Server started on ${protocol}://${host}:${port}`);
      registerTerminateHandler(eventName => {
        log.info(`Closing server for ${eventName}`);
        server.close(() => {
          log.info(`Server closed for ${eventName}`);
          resolve();
        });
      });
    });
  });
}
