import { GetMeshSourceOptions, MeshHandler, YamlConfig, KeyValueCache, ImportFn, Logger } from '@graphql-mesh/types';
import { soapGraphqlSchema, createSoapClient } from './soap-graphql';
import soap from 'soap';
import { getCachedFetch, loadFromModuleExportExpression, readFileOrUrlWithCache } from '@graphql-mesh/utils';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { env } from 'process';

type AnyFn = (...args: any[]) => any;

export default class SoapHandler implements MeshHandler {
  private config: YamlConfig.SoapHandler;
  private baseDir: string;
  private cache: KeyValueCache;
  private wsdlResponse: StoreProxy<{ res: { statusCode: number; body: string }; body: string }>;
  private importFn: ImportFn;
  private logger: Logger;

  constructor({ config, baseDir, cache, store, importFn, logger }: GetMeshSourceOptions<YamlConfig.SoapHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.wsdlResponse = store.proxy('wsdlResponse.json', PredefinedProxyOptions.JsonWithoutValidation);
    this.importFn = importFn;
    this.logger = logger;
  }

  async getMeshSource() {
    let schemaHeaders =
      typeof this.config.schemaHeaders === 'string'
        ? await loadFromModuleExportExpression(this.config.schemaHeaders, {
            cwd: this.baseDir,
            defaultExportName: 'default',
            importFn: this.importFn,
          })
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
          const isWsdlRequest = requestObj.uri.href === this.config.wsdl;
          const sendRequest = async () => {
            const headers = {
              ...requestObj.headers,
              ...(isWsdlRequest ? schemaHeaders : this.config.operationHeaders),
            };
            const res = await fetch(requestObj.uri.href, {
              headers,
              method: requestObj.method,
              body: requestObj.body,
            });
            const body = await res.text();
            return {
              res: {
                ...res,
                statusCode: res.status,
                body,
              },
              body,
            };
          };
          if (isWsdlRequest) {
            this.wsdlResponse
              .getWithSet(() => sendRequest().catch(err => callback(err)))
              .then(({ res, body }) => {
                callback(null, res, body);
              });
          } else {
            sendRequest()
              .then(({ res, body }) => callback(null, res, body))
              .catch(err => callback(err));
          }
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
      soapClient.setSecurity(new soap.WSSecurityCert(privateKey, publicKey, password));
    }

    const schema = await soapGraphqlSchema({
      soapClient,
      logger: this.logger,
      debug: !!env.DEBUG,
      warnings: !!env.DEBUG,
    });

    return {
      schema,
    };
  }
}
