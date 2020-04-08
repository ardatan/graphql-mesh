import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { soapGraphqlSchema, createSoapClient } from 'soap-graphql';
import { WSSecurityCert } from 'soap';
import { readFileOrUrlWithCache } from '@graphql-mesh/utils';

const handler: MeshHandlerLibrary<YamlConfig.SoapHandler> = {
  async getMeshSource({ cache, config }) {
    const soapClient = await createSoapClient(config.wsdl);
    const schema = await soapGraphqlSchema({
      soapClient,
    });
    if (config.securityCert) {
      const securityCertConfig = config.securityCert;
      const privateKey =
        securityCertConfig?.privateKey || (await readFileOrUrlWithCache(securityCertConfig?.privateKeyFilePath, cache));
      const publicKey =
        securityCertConfig?.publicKey || (await readFileOrUrlWithCache(securityCertConfig?.publicKeyFilePath, cache));
      const password =
        securityCertConfig?.password || (await readFileOrUrlWithCache(securityCertConfig?.passwordFilePath, cache));
      soapClient.setSecurity(new WSSecurityCert(privateKey, publicKey, password));
    }

    return {
      schema,
    };
  },
};

export default handler;
