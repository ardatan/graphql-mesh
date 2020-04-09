import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { soapGraphqlSchema, createSoapClient } from 'soap-graphql';
import { WSSecurityCert } from 'soap';
import { readFileOrUrlWithCache } from '@graphql-mesh/utils';

const handler: MeshHandlerLibrary<YamlConfig.SoapHandler> = {
  async getMeshSource({ config, cache }) {
    const soapClient = await createSoapClient(config.wsdl);
    const schema = await soapGraphqlSchema({
      soapClient,
    });
    if (config.securityCert) {
      const securityCertConfig = config.securityCert;
      const privateKey =
        securityCertConfig?.privateKey ||
        (securityCertConfig?.privateKeyFilePath &&
          (await readFileOrUrlWithCache(securityCertConfig?.privateKeyFilePath, cache, {
            allowUnknownExtensions: true,
          })));
      const publicKey =
        securityCertConfig?.publicKey ||
        (securityCertConfig?.publicKeyFilePath &&
          (await readFileOrUrlWithCache(securityCertConfig?.publicKeyFilePath, cache, {
            allowUnknownExtensions: true,
          })));
      const password =
        securityCertConfig?.password ||
        (securityCertConfig?.passwordFilePath &&
          (await readFileOrUrlWithCache(securityCertConfig?.passwordFilePath, cache, {
            allowUnknownExtensions: true,
          })));
      soapClient.setSecurity(new WSSecurityCert(privateKey, publicKey, password));
    }

    return {
      schema,
    };
  },
};

export default handler;
