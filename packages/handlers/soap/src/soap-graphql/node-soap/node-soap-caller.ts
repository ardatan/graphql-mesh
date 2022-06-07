import { SoapOperation } from '../soap2graphql/soap-endpoint';
import { SoapCaller, SoapCallInput } from '../soap2graphql/soap-caller';
import { NodeSoapClient } from './node-soap';
import { util } from '@graphql-mesh/cross-helpers';
import { LazyLoggerMessage, Logger } from '@graphql-mesh/types';

/**
 * Default implementation of SoapCaller for node-soap.
 */
export class NodeSoapCaller implements SoapCaller {
  constructor(protected soapClient: NodeSoapClient, protected logger: Logger) {}

  async call(input: SoapCallInput): Promise<any> {
    this.debug(() => [`call operation '${input.operation.name()}' with args '`, input.graphqlArgs]);

    const requestFunction = util.promisify(this.requestFunctionForOperation(input.operation).bind(this));

    const requestMessage: any = await this.createSoapRequestMessage(input);

    const res = await requestFunction(requestMessage);

    return this.createGraphqlResult(input, res);
  }

  protected requestFunctionForOperation(
    operation: SoapOperation
  ): (requestMessage: any, callback: (err: any, res: any) => void) => void {
    return this.soapClient[operation.service().name()][operation.port().name()][operation.name()];
  }

  protected async createSoapRequestMessage(input: SoapCallInput): Promise<any> {
    const requestMessage = {};
    Array.from(Object.keys(input.graphqlArgs)).forEach(key => {
      // objects provided by GraphQL will usually lack default-functions like "hasOwnProperty"
      // so deep-copy all objects to ensure those functions are present
      requestMessage[key] = this.deepCopy(input.graphqlArgs[key]);
    });
    return requestMessage;
  }

  protected deepCopy(obj: any): any {
    if (!obj) {
      return null;
    } else if (Object(obj) !== obj) {
      // primitive
      return obj;
    } else if (Array.isArray(obj)) {
      return obj.map(e => this.deepCopy(e));
    } else {
      const corrected = Object.assign({}, obj);
      Array.from(Object.keys(corrected)).forEach(key => {
        const value = corrected[key];
        corrected[key] = this.deepCopy(value);
      });
      return corrected;
    }
  }

  protected async createGraphqlResult(input: SoapCallInput, result: any): Promise<any> {
    this.debug(() => [`operation '${input.operation.name()}' returned `, result]);

    if (!input.operation.resultField()) {
      // void operation
      return !result ? null : JSON.stringify(result);
    } else {
      return !result ? null : result[input.operation.resultField()];
    }
  }

  protected debug(message: LazyLoggerMessage): void {
    this.logger.debug(message);
  }
}
