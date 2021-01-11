import { MeshHandler, YamlConfig } from '@graphql-mesh/utils';
import { soapGraphqlSchema, createSoapClient } from 'soap-graphql';
import { WSSecurityCert } from 'soap';

type AnyFn = (...args: any[]) => any;

export default class SoapHandler extends MeshHandler<YamlConfig.SoapHandler> {
  async getMeshSource() {
    const soapClient = await createSoapClient(this.config.wsdl, {
      basicAuth: this.config.basicAuth,
      options: {
        request: ((requestObj: any, callback: AnyFn) => {
          let _request: any = null;
          const sendRequest = async () => {
            const res = await this.handlerContext.fetch(requestObj.uri.href, {
              headers: requestObj.headers,
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
            this.readFileOrUrl<string>(securityCertConfig.privateKeyPath, {
              allowUnknownExtensions: true,
            })),
        securityCertConfig.publicKey ||
          (securityCertConfig.publicKeyPath &&
            this.readFileOrUrl<string>(securityCertConfig.publicKeyPath, {
              allowUnknownExtensions: true,
            })),
        securityCertConfig.password ||
          (securityCertConfig.passwordPath &&
            this.readFileOrUrl<string>(securityCertConfig.passwordPath, {
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
