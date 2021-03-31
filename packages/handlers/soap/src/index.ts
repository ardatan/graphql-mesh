import { GetMeshSourceOptions, MeshHandler, YamlConfig, KeyValueCache } from '@graphql-mesh/types';
import { soapGraphqlSchema, createSoapClient } from 'soap-graphql';
import { WSSecurityCert } from 'soap';
import { getCachedFetch, loadFromModuleExportExpression, readFileOrUrlWithCache } from '@graphql-mesh/utils';

type AnyFn = (...args: any[]) => any;

export default class SoapHandler implements MeshHandler {
  private config: YamlConfig.SoapHandler;
  private baseDir: string;
  private cache: KeyValueCache;

  constructor({ config, baseDir, cache }: GetMeshSourceOptions<YamlConfig.SoapHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
  }

  async getMeshSource() {
    let schemaHeaders =
      typeof this.config.schemaHeaders === 'string'
        ? await loadFromModuleExportExpression(this.config.schemaHeaders, { cwd: this.baseDir })
        : this.config.schemaHeaders;
    if (typeof schemaHeaders === 'function') {
      schemaHeaders = schemaHeaders();
    }
    if (schemaHeaders && 'then' in schemaHeaders) {
      schemaHeaders = await schemaHeaders;
    }
    const fetch = getCachedFetch(this.cache);
    const soapClient = await createSoapClient(this.config.wsdl, {
      basicAuth: this.config.basicAuth,
      options: {
        request: ((requestObj: any, callback: AnyFn) => {
          let _request: any = null;
          const sendRequest = async () => {
            const headers = {
              ...requestObj.headers,
              ...(requestObj.uri.href === this.config.wsdl ? schemaHeaders : this.config.operationHeaders),
            };
            const res = await fetch(requestObj.uri.href, {
              headers,
              method: requestObj.method,
              body: requestObj.body,
            });
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
              cwd: this.baseDir,
            })),
        securityCertConfig.publicKey ||
          (securityCertConfig.publicKeyPath &&
            readFileOrUrlWithCache<string>(securityCertConfig.publicKeyPath, this.cache, {
              allowUnknownExtensions: true,
              cwd: this.baseDir,
            })),
        securityCertConfig.password ||
          (securityCertConfig.passwordPath &&
            readFileOrUrlWithCache<string>(securityCertConfig.passwordPath, this.cache, {
              allowUnknownExtensions: true,
              cwd: this.baseDir,
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
