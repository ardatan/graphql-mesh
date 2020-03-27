import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { soapGraphqlSchema, createSoapClient } from 'soap-graphql';
import { WSSecurityCert } from 'soap';

const handler: MeshHandlerLibrary<YamlConfig.SoapHandler> = {
  async getMeshSource({ config }) {
    const soapClient = await createSoapClient(config.wsdl)
    const schema = await soapGraphqlSchema({
      soapClient,
    });
    if (config.securityCert) {
      const { publicKey: publicKeyPath, privateKey: privateKeyPath, password } = config.securityCert;
      const { readFileSync } = await import('fs');
      const publicKey = readFileSync(publicKeyPath, 'utf8');
      const privateKey = readFileSync(privateKeyPath, 'utf8');
      soapClient.setSecurity(new WSSecurityCert(privateKey, publicKey, password))
    }

    return {
      schema
    };
  }
};

export default handler;
