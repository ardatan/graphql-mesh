import { SoapOperation } from '../soap2graphql/soap-endpoint';
import { SoapCaller, SoapCallInput } from '../soap2graphql/soap-caller';
import { NodeSoapClient } from './node-soap';
import { inspect, promisify } from 'util';
import { Logger } from '@graphql-mesh/types';

/**
 * Default implementation of SoapCaller for node-soap.
 */
export class NodeSoapCaller implements SoapCaller {
  constructor(protected soapClient: NodeSoapClient, protected logger: Logger) {}

  async call(input: SoapCallInput): Promise<any> {
    this.debug(`call operation '${input.operation.name()}' with args '${inspect(input.graphqlArgs, false, 5)}'`);

    const requestFunction = promisify(this.requestFunctionForOperation(input.operation), this);

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
    this.debug(`operation '${input.operation.name()}' returned '${inspect(result, false, 5)}'`);

    if (!input.operation.resultField()) {
      // void operation
      return !result ? null : JSON.stringify(result);
    } else {
      return !result ? null : result[input.operation.resultField()];
    }
  }

  protected debug(message: string): void {
    this.logger.debug(message);
  }
}
