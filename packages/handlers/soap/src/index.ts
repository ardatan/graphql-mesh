import { GetMeshSourceOptions, MeshHandler, YamlConfig, KeyValueCache } from '@graphql-mesh/types';
import { soapGraphqlSchema, createSoapClient } from 'soap-graphql';
import { WSSecurityCert } from 'soap';
import { readFileOrUrlWithCache } from '@graphql-mesh/utils';
import { Request, fetchache } from 'fetchache';

type AnyFn = (...args: any[]) => any;

export default class SoapHandler implements MeshHandler {
  config: YamlConfig.SoapHandler;
  cache: KeyValueCache;

  constructor({ config, cache }: GetMeshSourceOptions<YamlConfig.SoapHandler>) {
    this.config = config;
    this.cache = cache;
  }

  async getMeshSource() {
    const soapClient = await createSoapClient(this.config.wsdl, {
      basicAuth: this.config.basicAuth,
      options: {
        request: ((requestObj: any, callback: AnyFn) => {
          let _request: any = null;
          const sendRequest = async () => {
            const req = new Request(requestObj.uri.href, {
              headers: requestObj.headers,
              method: requestObj.method,
              body: requestObj.body,
            });
            const res = await fetchache(req, this.cache);
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

    if (this.config.securityCert) {
      const securityCertConfig = this.config.securityCert;
      const [privateKey, publicKey, password] = await Promise.all([
        securityCertConfig.privateKey ||
          (securityCertConfig.privateKeyPath &&
            readFileOrUrlWithCache<string>(securityCertConfig.privateKeyPath, this.cache, {
              allowUnknownExtensions: true,
            })),
        securityCertConfig.publicKey ||
          (securityCertConfig.publicKeyPath &&
            readFileOrUrlWithCache<string>(securityCertConfig.publicKeyPath, this.cache, {
              allowUnknownExtensions: true,
            })),
        securityCertConfig.password ||
          (securityCertConfig.passwordPath &&
            readFileOrUrlWithCache<string>(securityCertConfig.passwordPath, this.cache, {
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
  }
}
