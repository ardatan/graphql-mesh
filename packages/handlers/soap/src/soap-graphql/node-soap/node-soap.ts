import soap from 'soap';

/**
 * Type for the soap-client from node-soap.
 */
export type NodeSoapClient = any | soap.Client;

export type NodeSoapWsdl = any | soap.WSDL;

/**
 * Creation options for a node-soap client.
 */
export type NodeSoapOptions = {
  options?: soap.IOptions;
  /**
   * For convenience:
   * If set, the security of the created node-soap client will be set to basic-auth with the given options.
   */
  basicAuth?: {
    username: string;
    password: string;
  };
};

export async function createSoapClient(url: string, options: NodeSoapOptions = {}): Promise<NodeSoapClient> {
  const opts: soap.IOptions = !options.options ? {} : options.options;
  return new Promise<any>((resolve, reject) => {
    try {
      soap.createClient(url, opts, (err: any, client: soap.Client) => {
        if (err) {
          reject(err);
        } else {
          if (options.basicAuth) {
            client.setSecurity(new soap.BasicAuthSecurity(options.basicAuth.username, options.basicAuth.password));
          }
          resolve(client);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
