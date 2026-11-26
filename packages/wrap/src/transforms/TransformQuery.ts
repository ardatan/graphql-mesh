import {
  Kind,
  visit,
  type DocumentNode,
  type FieldNode,
  type FragmentDefinitionNode,
  type GraphQLError,
  type SelectionSetNode,
} from 'graphql';
import {
  isPrototypePollutingKey,
  setOwnProp,
  type DelegationContext,
  type Transform,
} from '@graphql-tools/delegate';
import {
  getOperationASTFromRequest,
  relocatedError,
  type ExecutionRequest,
  type ExecutionResult,
} from '@graphql-tools/utils';

export type QueryTransformer = <TContext>(
  selectionSet: SelectionSetNode | undefined,
  fragments: Record<string, FragmentDefinitionNode>,
  delegationContext: DelegationContext<TContext>,
  transformationContext: Record<string, any>,
) => SelectionSetNode;

export type ResultTransformer = <TContext>(
  result: any,
  delegationContext: DelegationContext<TContext>,
  transformationContext: Record<string, any>,
) => any;

export type ErrorPathTransformer = (path: ReadonlyArray<string | number>) => Array<string | number>;

interface TransformQueryTransformationContext extends Record<string, any> {
  responsePath?: Array<string>;
}

export default class TransformQuery<TContext = Record<string, any>> implements Transform<
  TransformQueryTransformationContext,
  TContext
> {
  private readonly path: Array<string>;
  private readonly queryTransformer: QueryTransformer;
  private readonly resultTransformer: ResultTransformer;
  private readonly errorPathTransformer: ErrorPathTransformer;
  private readonly fragments: Record<string, FragmentDefinitionNode>;

  constructor({
    path,
    queryTransformer,
    resultTransformer = result => result,
    errorPathTransformer = errorPath => [...errorPath],
    fragments = {},
  }: {
    path: Array<string>;
    queryTransformer: QueryTransformer;
    resultTransformer?: ResultTransformer;
    errorPathTransformer?: ErrorPathTransformer;
    fragments?: Record<string, FragmentDefinitionNode>;
  }) {
    this.path = path;
    const pollutingKeys = this.path.filter(isPrototypePollutingKey);
    if (pollutingKeys.length > 0) {
      throw new TypeError(
        `Invalid path - cannot be a prototype polluting keys: ${pollutingKeys.join('.')}`,
      );
    }
    this.queryTransformer = queryTransformer;
    this.resultTransformer = resultTransformer;
    this.errorPathTransformer = errorPathTransformer;
    this.fragments = fragments;
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext<TContext>,
    transformationContext: TransformQueryTransformationContext,
  ): ExecutionRequest {
    const pathLength = this.path.length;
    let index = 0;
    const responseKeyStack: Array<string> = [];
    const operationAst = getOperationASTFromRequest(originalRequest);
    const document: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: originalRequest.document.definitions.map(def => {
        if (def === operationAst) {
          return visit(def, {
            [Kind.FIELD]: {
              enter: (node: FieldNode) => {
                if (index === pathLength || node.name.value !== this.path[index]) {
                  return false;
                }

                // Record the actual response key (alias or field name).
                responseKeyStack.push(node.alias?.value ?? node.name.value);
                index++;

                if (index === pathLength) {
                  transformationContext.responsePath = responseKeyStack.slice();
                  const selectionSet = this.queryTransformer(
                    node.selectionSet,
                    this.fragments,
                    delegationContext,
                    transformationContext,
                  );

                  return {
                    ...node,
                    selectionSet,
                  };
                }
                return undefined;
              },
              leave: () => {
                responseKeyStack.pop();
                index--;
              },
            },
          });
        }
        return def;
      }),
    };

    return {
      ...originalRequest,
      document,
    };
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext<TContext>,
    transformationContext: TransformQueryTransformationContext,
  ): ExecutionResult {
    const data = this.transformData(originalResult.data, delegationContext, transformationContext);
    const errors = originalResult.errors;
    return {
      data,
      errors: errors != null ? this.transformErrors(errors, transformationContext) : undefined,
    };
  }

  private transformData(
    data: any,
    delegationContext: DelegationContext<TContext>,
    transformationContext: TransformQueryTransformationContext,
  ): any {
    const path = transformationContext.responsePath ?? this.path;
    const leafIndex = path.length - 1;
    if (leafIndex < 0) {
      return data;
    }

    let index = 0;
    let newData = data;
    if (newData) {
      while (index < leafIndex) {
        const next = path[index]!;
        // Return unchanged when an intermediate ancestor is null/missing.
        if (newData[next] == null) {
          return data;
        }
        // Read each segment from the current container, not the root.
        newData = newData[next];
        index++;
      }
      const leafKey = path[leafIndex]!;
      // Missing leaf key: do not transform. Null leaf with a complete path: transform.
      if (!Object.prototype.hasOwnProperty.call(newData, leafKey)) {
        return data;
      }
      setOwnProp(
        newData,
        leafKey,
        this.resultTransformer(newData[leafKey], delegationContext, transformationContext),
      );
    }
    return data;
  }

  private transformErrors(
    errors: ReadonlyArray<GraphQLError>,
    transformationContext: TransformQueryTransformationContext,
  ): ReadonlyArray<GraphQLError> {
    const path = transformationContext.responsePath ?? this.path;
    return errors.map(error => {
      const errorPath: ReadonlyArray<string | number> | undefined = error.path;

      if (errorPath == null) {
        return error;
      }

      let match = true;
      let index = 0;
      while (index < path.length) {
        if (errorPath[index] !== path[index]) {
          match = false;
          break;
        }
        index++;
      }

      const newPath = match
        ? errorPath.slice(0, index).concat(this.errorPathTransformer(errorPath.slice(index)))
        : errorPath;

      return relocatedError(error, newPath);
    });
  }
}
