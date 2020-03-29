import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { soapGraphqlSchema, createSoapClient } from 'soap-graphql';
import { WSSecurityCert } from 'soap';

async function openFile(path?: string) {
  if (path) {
    const { promises: { readFile } } = await import('fs');
    return readFile(path, 'utf-8');
  }
}

const handler: MeshHandlerLibrary<YamlConfig.SoapHandler> = {
  async getMeshSource({ config }) {
    const soapClient = await createSoapClient(config.wsdl)
    const schema = await soapGraphqlSchema({
      soapClient,
    });
    if (config.securityCert) {
      const securityCertConfig = config.securityCert;
      const privateKey = securityCertConfig?.privateKey || await openFile(securityCertConfig?.privateKeyFilePath);
      const publicKey = securityCertConfig?.publicKey || await openFile(securityCertConfig?.publicKeyFilePath);
      const password = securityCertConfig?.password || await openFile(securityCertConfig?.passwordFilePath);
      soapClient.setSecurity(new WSSecurityCert(privateKey, publicKey, password))
    }

    return {
      schema
    };
  }
};

export default handler;
