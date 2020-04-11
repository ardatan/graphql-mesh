import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { soapGraphqlSchema, createSoapClient } from 'soap-graphql';
import { WSSecurityCert } from 'soap';
import { readFileOrUrlWithCache } from '@graphql-mesh/utils';

const handler: MeshHandlerLibrary<YamlConfig.SoapHandler> = {
  async getMeshSource({ config, cache }) {
    const soapClient = await createSoapClient(config.wsdl, {
      basicAuth: config.basicAuth,
    });

    if (config.securityCert) {
      const securityCertConfig = config.securityCert;
      const [privateKey, publicKey, password] = await Promise.all([
        securityCertConfig.privateKey ||
          (securityCertConfig.privateKeyFilePath &&
            readFileOrUrlWithCache<string>(securityCertConfig.privateKeyFilePath, cache, {
              allowUnknownExtensions: true,
            })),
        securityCertConfig.publicKey ||
          (securityCertConfig.publicKeyFilePath &&
            readFileOrUrlWithCache<string>(securityCertConfig.publicKeyFilePath, cache, {
              allowUnknownExtensions: true,
            })),
        securityCertConfig.password ||
          (securityCertConfig.passwordFilePath &&
            readFileOrUrlWithCache<string>(securityCertConfig.passwordFilePath, cache, {
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
