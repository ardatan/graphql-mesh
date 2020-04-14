import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { soapGraphqlSchema, createSoapClient } from 'soap-graphql';
import { WSSecurityCert } from 'soap';
import { readFileOrUrlWithCache } from '@graphql-mesh/utils';
import { Request, fetchache } from 'fetchache';

const handler: MeshHandlerLibrary<YamlConfig.SoapHandler> = {
  async getMeshSource({ config, cache }) {
    const soapClient = await createSoapClient(config.wsdl, {
      basicAuth: config.basicAuth,
      options: {
        request: ((requestObj: any, callback: Function) => {
          let _request: any = null;
          const sendRequest = async () => {
            const req = new Request(requestObj.uri.href, {
              headers: requestObj.headers,
              method: requestObj.method,
              body: requestObj.body,
            });
            const res = await fetchache(req, cache);
            // eslint-disable-next-line dot-notation
            _request = res.body;
            const body = await res.text();
            return { res, body };
          };
          sendRequest()
            .then(({ res, body }) =>
              callback(
                null,
                {
                  ...res,
                  statusCode: res.status,
                },
                body
              )
            )
            .catch(err => callback(err));
          // eslint-disable-next-line dot-notation
          return _request;
        }) as any,
      },
    });

    if (config.securityCert) {
      const securityCertConfig = config.securityCert;
      const [privateKey, publicKey, password] = await Promise.all([
        securityCertConfig.privateKey ||
          (securityCertConfig.privateKeyPath &&
            readFileOrUrlWithCache<string>(securityCertConfig.privateKeyPath, cache, {
              allowUnknownExtensions: true,
            })),
        securityCertConfig.publicKey ||
          (securityCertConfig.publicKeyPath &&
            readFileOrUrlWithCache<string>(securityCertConfig.publicKeyPath, cache, {
              allowUnknownExtensions: true,
            })),
        securityCertConfig.password ||
          (securityCertConfig.passwordPath &&
            readFileOrUrlWithCache<string>(securityCertConfig.passwordPath, cache, {
              allowUnknownExtensions: true,
            })),
      ]);
      soapClient.setSecurity(new WSSecurityCert(privateKey, publicKey, password));
    }

    const schema = await soapGraphqlSchema({
      soapClient,
    });

    return {
      schema,
    };
  },
};

export default handler;
