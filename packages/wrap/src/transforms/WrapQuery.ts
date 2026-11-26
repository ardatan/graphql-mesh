import { Kind, visit, type FieldNode, type SelectionNode, type SelectionSetNode } from 'graphql';
import {
  isPrototypePollutingKey,
  setOwnProp,
  type DelegationContext,
  type Transform,
} from '@graphql-tools/delegate';
import type { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';

export type QueryWrapper = (subtree: SelectionSetNode) => SelectionNode | SelectionSetNode;

interface WrapQueryTransformationContext extends Record<string, any> {
  responsePath?: Array<string>;
}

export default class WrapQuery<TContext = Record<string, any>> implements Transform<
  WrapQueryTransformationContext,
  TContext
> {
  constructor(
    private readonly path: Array<string>,
    private readonly wrapper: QueryWrapper,
    private readonly extractor: (result: any) => any,
  ) {
    const pollutingKeys = this.path.filter(isPrototypePollutingKey);
    if (pollutingKeys.length > 0) {
      throw new TypeError(
        `Invalid path - cannot be a prototype polluting keys: ${pollutingKeys.join('.')}`,
      );
    }
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext<TContext>,
    transformationContext: WrapQueryTransformationContext,
  ): ExecutionRequest {
    const fieldPath: Array<string> = [];
    const responseKeyStack: Array<string> = [];
    const ourPath = JSON.stringify(this.path);
    const document = visit(originalRequest.document, {
      [Kind.FIELD]: {
        enter: (node: FieldNode) => {
          fieldPath.push(node.name.value);
          responseKeyStack.push(node.alias?.value ?? node.name.value);
          if (node.selectionSet != null && ourPath === JSON.stringify(fieldPath)) {
            transformationContext.responsePath = responseKeyStack.slice();
            const wrapResult = this.wrapper(node.selectionSet);

            // Selection can be either a single selection or a selection set. If it's just one selection,
            // let's wrap it in a selection set. Otherwise, keep it as is.
            const selectionSet =
              wrapResult != null && wrapResult.kind === Kind.SELECTION_SET
                ? wrapResult
                : {
                    kind: Kind.SELECTION_SET,
                    selections: [wrapResult],
                  };

            return {
              ...node,
              selectionSet,
            };
          }
          return undefined;
        },
        leave: () => {
          fieldPath.pop();
          responseKeyStack.pop();
        },
      },
    });
    return {
      ...originalRequest,
      document,
    };
  }

  public transformResult(
    originalResult: ExecutionResult,
    _delegationContext: DelegationContext<TContext>,
    transformationContext: WrapQueryTransformationContext,
  ): ExecutionResult {
    const rootData = originalResult.data;
    if (rootData != null) {
      const path = transformationContext.responsePath ?? this.path;
      let data = rootData;
      for (let i = 0; i < path.length - 1; i++) {
        const next = path[i]!;
        // Stop and leave the result unchanged when an ancestor is null/missing.
        if (data[next] == null) {
          return {
            data: rootData,
            errors: originalResult.errors,
          };
        }
        data = data[next];
      }
      const lastKey = path[path.length - 1]!;
      if (Object.prototype.hasOwnProperty.call(data, lastKey)) {
        setOwnProp(data, lastKey, this.extractor(data[lastKey]));
      }
    }

    return {
      data: rootData,
      errors: originalResult.errors,
    };
  }
}
