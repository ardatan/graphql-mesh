import { SoapOperation } from './soap-endpoint';
import { GraphQLResolveInfo } from 'graphql';

export type SoapCallInput = {
  operation: SoapOperation;
  graphqlSource: any;
  graphqlArgs: { [argName: string]: any };
  graphqlContext: any;
  graphqlInfo: GraphQLResolveInfo;
};

export interface SoapCaller {
  /**
   * Executes a SOAP call.
   */
  call(input: SoapCallInput): Promise<any>;
}
