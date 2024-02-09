import {
  ASTNode,
  ConstDirectiveNode,
  GraphQLError,
  valueFromASTUntyped,
  type GraphQLSchema,
} from 'graphql';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import {
  getOperationsAndFragments,
  getRootFieldsWithArgs,
  projectResultBySelectionSet,
} from '@graphql-mesh/utils';
import { ExecutionRequest, ExecutionResult, Executor, getRootTypeMap } from '@graphql-tools/utils';
import { createGraphQLThriftClient } from './client.js';
import { GraphQLThriftAnnotations } from './types.js';

interface DirectiveAnnotation {
  name: string;
  args: any;
}

function getDirectiveAnnotations(directableObj: {
  astNode?: ASTNode & { directives?: readonly ConstDirectiveNode[] };
  extensions?: any;
}): DirectiveAnnotation[] {
  const directiveAnnotations: DirectiveAnnotation[] = [];
  if (directableObj.astNode?.directives?.length) {
    directableObj.astNode.directives.forEach(directive => {
      directiveAnnotations.push({
        name: directive.name.value,
        args: directive.arguments
          ? Object.fromEntries(
              directive.arguments.map(arg => [arg.name.value, valueFromASTUntyped(arg.value)]),
            )
          : {},
      });
    });
  }
  if (directableObj.extensions?.directives) {
    for (const directiveName in directableObj.extensions.directives) {
      const directiveObjs = directableObj.extensions.directives[directiveName];
      if (Array.isArray(directiveObjs)) {
        directiveObjs.forEach(directiveObj => {
          directiveAnnotations.push({
            name: directiveName,
            args: directiveObj,
          });
        });
      } else {
        directiveAnnotations.push({
          name: directiveName,
          args: directiveObjs,
        });
      }
    }
  }
  return directiveAnnotations;
}

export function getThriftExecutor(subgraph: GraphQLSchema): Executor {
  const schemaDefDirectives = getDirectiveAnnotations(subgraph);
  const graphqlAnnotations = schemaDefDirectives.find(directive => directive.name === 'transport')
    ?.args as GraphQLThriftAnnotations;
  if (!graphqlAnnotations) throw new Error('No @transport directive found on schema definition');
  const client = createGraphQLThriftClient(graphqlAnnotations);
  const headersFactory = getInterpolatedHeadersFactory(graphqlAnnotations.headers);
  const rootTypeMap = getRootTypeMap(subgraph);
  const fieldTypeMapDirectivesByField = new Map<string, DirectiveAnnotation[]>();

  return async function thriftExecutor(
    executionRequest: ExecutionRequest,
  ): Promise<ExecutionResult<any, any>> {
    const operationsAndFragments = getOperationsAndFragments(executionRequest.document);
    const operationName =
      executionRequest.operationName || Object.keys(operationsAndFragments.operations)[0];
    const operationAst = operationsAndFragments.operations[operationName];
    const rootType = rootTypeMap.get(operationAst.operation);
    if (!rootType) {
      throw new Error(`No root type found for operation type ${operationAst.operation}`);
    }
    const rootFieldMap = rootType.getFields();
    const rootFieldsWithArgs = getRootFieldsWithArgs(subgraph, executionRequest);
    const requestPromises: Promise<void>[] = [];
    const root: any = {};
    const errors: GraphQLError[] = [];
    for (const [fieldName, args] of rootFieldsWithArgs) {
      const field = rootFieldMap[fieldName];
      if (!field) {
        throw new Error(`No root field found for field ${fieldName}`);
      }
      let fieldTypeMapDirectives = fieldTypeMapDirectivesByField.get(fieldName);
      if (fieldTypeMapDirectives == null) {
        fieldTypeMapDirectives = getDirectiveAnnotations(field).filter(
          directive => directive.name === 'fieldTypeMap',
        );
        fieldTypeMapDirectivesByField.set(fieldName, fieldTypeMapDirectives || []);
      }
      fieldTypeMapDirectives?.forEach(fieldTypeMap => {
        requestPromises.push(
          client
            .doRequest(fieldName, args, fieldTypeMap.args, {
              headers: headersFactory({
                root,
                args,
                context: executionRequest.context,
                env: globalThis.process?.env,
              }),
            })
            .then(result => {
              root[fieldName] = result;
            })
            .catch(err => {
              errors.push(err);
            }),
        );
      });
    }
    await Promise.all(requestPromises);
    const projectedData = projectResultBySelectionSet({
      result: root,
      selectionSet: operationAst.selectionSet,
      fragments: operationsAndFragments.fragments,
    });
    return {
      data: projectedData,
      errors: errors.length ? errors : undefined,
    };
  };
}
