// adapted from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js

import {
  Kind,
  visit,
  type DefinitionNode,
  type DocumentNode,
  type FieldNode,
  type FragmentDefinitionNode,
  type FragmentSpreadNode,
  type InlineFragmentNode,
  type OperationDefinitionNode,
  type OperationTypeNode,
  type SelectionNode,
  type VariableDefinitionNode,
  type VariableNode,
} from 'graphql';
import { abortSignalAll } from '@graphql-hive/signal';
import { type ExecutionRequest } from '@graphql-tools/utils';
import { createPrefix } from './prefix.js';

/**
 * Merge multiple queries into a single query in such a way that query results
 * can be split and transformed as if they were obtained by running original queries.
 *
 * Merging algorithm involves several transformations:
 *  1. Replace top-level fragment spreads with inline fragments (... on Query {})
 *  2. Add unique aliases to all top-level query fields (including those on inline fragments)
 *  3. Prefix all variable definitions and variable usages
 *  4. Prefix names (and spreads) of fragments
 *
 * i.e transform:
 *   [
 *     `query Foo($id: ID!) { foo, bar(id: $id), ...FooQuery }
 *     fragment FooQuery on Query { baz }`,
 *
 *    `query Bar($id: ID!) { foo: baz, bar(id: $id), ... on Query { baz } }`
 *   ]
 * to:
 *   query (
 *     $graphqlTools1_id: ID!
 *     $graphqlTools2_id: ID!
 *   ) {
 *     graphqlTools1_foo: foo,
 *     graphqlTools1_bar: bar(id: $graphqlTools1_id)
 *     ... on Query {
 *       graphqlTools1__baz: baz
 *     }
 *     graphqlTools1__foo: baz
 *     graphqlTools1__bar: bar(id: $graphqlTools1__id)
 *     ... on Query {
 *       graphqlTools1__baz: baz
 *     }
 *   }
 */
export function mergeRequests(
  requests: ReadonlyArray<ExecutionRequest>,
  extensionsReducer: (
    mergedExtensions: Record<string, any>,
    request: ExecutionRequest,
  ) => Record<string, any>,
  defer = false,
): ExecutionRequest {
  const firstRequest = requests[0]!;
  if (!firstRequest) {
    throw new Error('At least one request is required');
  }
  const requestCount = requests.length;
  if (requestCount === 1) {
    return firstRequest;
  }
  const mergedVariables: Record<string, any> = Object.create(null);
  const mergedVariableDefinitions: Array<VariableDefinitionNode> = [];
  const mergedSelections: Array<SelectionNode> = [];
  const mergedFragmentDefinitions: Array<FragmentDefinitionNode> = [];
  const signals = new Set<AbortSignal>();
  let mergedExtensions: Record<string, any> = Object.create(null);
  let subgraphName: string | undefined;
  let operationName: string | undefined;
  let operationType: OperationTypeNode | undefined;
  let context;
  let info: ExecutionRequest['info'];
  let rootValue;

  for (let index = 0; index < requestCount; index++) {
    const request = requests[index];
    if (request) {
      subgraphName ??= request.subgraphName;
      operationName ??= request.operationName;
      operationType ??= request.operationType;
      context ??= request.context;
      info ??= request.info;
      rootValue ??= request.rootValue;

      const prefixedRequests = prefixRequest(createPrefix(index), request);

      for (const def of prefixedRequests.document.definitions) {
        if (isOperationDefinition(def)) {
          const selections = defer
            ? wrapRootSelectionsInDefer(def.selectionSet.selections, `batch_${index}`)
            : def.selectionSet.selections;
          mergedSelections.push(...selections);
          operationType ??= def.operation;
          operationName ??= def.name?.value;
          if (def.variableDefinitions) {
            mergedVariableDefinitions.push(...def.variableDefinitions);
          }
        }
        if (isFragmentDefinition(def)) {
          mergedFragmentDefinitions.push(def);
        }
      }
      Object.assign(mergedVariables, prefixedRequests.variables);
      mergedExtensions = extensionsReducer(mergedExtensions, request);
      if (request.signal) {
        signals.add(request.signal);
      }
    }
  }

  // If no operationName is found, then inherit the parent operationName from the operation itself, if it has a name.
  if (operationName == null) {
    operationName = info?.operation?.name?.value;
  }

  operationType ||= 'query' as OperationTypeNode;

  const mergedOperationDefinition: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation: operationType,
    variableDefinitions: mergedVariableDefinitions,
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: mergedSelections,
    },
    name: operationName
      ? {
          kind: Kind.NAME,
          value: operationName,
        }
      : undefined,
  };

  return {
    subgraphName,
    document: {
      kind: Kind.DOCUMENT,
      definitions: [mergedOperationDefinition, ...mergedFragmentDefinitions],
    },
    variables: mergedVariables,
    extensions: mergedExtensions,
    context,
    info,
    operationType,
    rootValue,
    operationName,
    signal: abortSignalAll(Array.from(signals)),
  };
}

function prefixRequest(prefix: string, request: ExecutionRequest): ExecutionRequest {
  function prefixNode(node: VariableNode | FragmentDefinitionNode | FragmentSpreadNode) {
    return prefixNodeName(node, prefix);
  }

  let prefixedDocument = aliasTopLevelFields(prefix, request.document);

  let hasFragmentDefinitionsOrVariables = false;

  for (const def of prefixedDocument.definitions) {
    if (
      isFragmentDefinition(def) ||
      (isOperationDefinition(def) && !!def.variableDefinitions?.length)
    ) {
      hasFragmentDefinitionsOrVariables = true;
      break;
    }
  }
  const fragmentSpreadImpl: Record<string, boolean> = {};

  let hasFragments = false;
  if (hasFragmentDefinitionsOrVariables) {
    prefixedDocument = visit(prefixedDocument, {
      [Kind.VARIABLE]: prefixNode,
      [Kind.FRAGMENT_DEFINITION](node) {
        hasFragments = true;
        return prefixNode(node);
      },
      [Kind.FRAGMENT_SPREAD]: node => {
        node = prefixNodeName(node, prefix);
        fragmentSpreadImpl[node.name.value] = true;
        return node;
      },
    });
  }

  let prefixedVariables: typeof executionVariables;
  const executionVariables = request.variables;

  if (executionVariables) {
    prefixedVariables = Object.create(null);
    for (const variableName in executionVariables) {
      prefixedVariables[prefix + variableName] = executionVariables[variableName];
    }
  }

  if (hasFragments) {
    prefixedDocument = {
      ...prefixedDocument,
      definitions: prefixedDocument.definitions.filter(
        def => !isFragmentDefinition(def) || fragmentSpreadImpl[def.name.value],
      ),
    };
  }

  return {
    document: prefixedDocument,
    variables: prefixedVariables,
  };
}

/**
 * Adds prefixed aliases to top-level fields of the query.
 *
 * @see aliasFieldsInSelection for implementation details
 */
function aliasTopLevelFields(prefix: string, document: DocumentNode): DocumentNode {
  const transformer = {
    [Kind.OPERATION_DEFINITION]: (def: OperationDefinitionNode) => {
      const { selections } = def.selectionSet;
      return {
        ...def,
        selectionSet: {
          ...def.selectionSet,
          selections: aliasFieldsInSelection(prefix, selections, document),
        },
      };
    },
  };
  return visit(document, transformer, {
    [Kind.DOCUMENT]: [`definitions`],
  });
}

/**
 * Add aliases to fields of the selection, including top-level fields of inline fragments.
 * Fragment spreads are converted to inline fragments and their top-level fields are also aliased.
 *
 * Note that this method is shallow. It adds aliases only to the top-level fields and doesn't
 * descend to field sub-selections.
 *
 * For example, transforms:
 *   {
 *     foo
 *     ... on Query { foo }
 *     ...FragmentWithBarField
 *   }
 * To:
 *   {
 *     graphqlTools1_foo: foo
 *     ... on Query { graphqlTools1_foo: foo }
 *     ... on Query { graphqlTools1_bar: bar }
 *   }
 */
function aliasFieldsInSelection(
  prefix: string,
  selections: ReadonlyArray<SelectionNode>,
  document: DocumentNode,
): Array<SelectionNode> {
  return selections.map(selection => {
    switch (selection.kind) {
      case Kind.INLINE_FRAGMENT:
        return aliasFieldsInInlineFragment(prefix, selection, document);
      case Kind.FRAGMENT_SPREAD: {
        const inlineFragment = inlineFragmentSpread(selection, document);
        return aliasFieldsInInlineFragment(prefix, inlineFragment, document);
      }
      case Kind.FIELD:
      default:
        return aliasField(selection, prefix);
    }
  });
}

/**
 * Add aliases to top-level fields of the inline fragment.
 * Returns new inline fragment node.
 *
 * For Example, transforms:
 *   ... on Query { foo, ... on Query { bar: foo } }
 * To
 *   ... on Query { graphqlTools1_foo: foo, ... on Query { graphqlTools1_bar: foo } }
 */
function aliasFieldsInInlineFragment(
  prefix: string,
  fragment: InlineFragmentNode,
  document: DocumentNode,
): InlineFragmentNode {
  const { selections } = fragment.selectionSet;
  return {
    ...fragment,
    selectionSet: {
      ...fragment.selectionSet,
      selections: aliasFieldsInSelection(prefix, selections, document),
    },
  };
}

/**
 * Replaces fragment spread with inline fragment
 *
 * Example:
 *   query { ...Spread }
 *   fragment Spread on Query { bar }
 *
 * Transforms to:
 *   query { ... on Query { bar } }
 */
function inlineFragmentSpread(
  spread: FragmentSpreadNode,
  document: DocumentNode,
): InlineFragmentNode {
  const fragment = document.definitions.find(
    def => isFragmentDefinition(def) && def.name.value === spread.name.value,
  ) as FragmentDefinitionNode;
  if (!fragment) {
    throw new Error(`Fragment ${spread.name.value} does not exist`);
  }
  const { typeCondition, selectionSet } = fragment;
  return {
    kind: Kind.INLINE_FRAGMENT,
    typeCondition,
    selectionSet,
    directives: spread.directives,
  };
}

function prefixNodeName<T extends VariableNode | FragmentDefinitionNode | FragmentSpreadNode>(
  namedNode: T,
  prefix: string,
): T {
  return {
    ...namedNode,
    name: {
      ...namedNode.name,
      value: prefix + namedNode.name.value,
    },
  };
}

/**
 * Returns a new FieldNode with prefixed alias
 *
 * Example. Given prefix === "graphqlTools1_" transforms:
 *   { foo } -> { graphqlTools1_foo: foo }
 *   { foo: bar } -> { graphqlTools1_foo: bar }
 */
function aliasField(field: FieldNode, aliasPrefix: string): FieldNode {
  const aliasNode = field.alias ? field.alias : field.name;
  return {
    ...field,
    alias: {
      ...aliasNode,
      value: aliasPrefix + aliasNode.value,
    },
  };
}

function isOperationDefinition(def: DefinitionNode): def is OperationDefinitionNode {
  return def.kind === Kind.OPERATION_DEFINITION;
}

function isFragmentDefinition(def: DefinitionNode): def is FragmentDefinitionNode {
  return def.kind === Kind.FRAGMENT_DEFINITION;
}

function wrapRootSelectionsInDefer(
  selections: ReadonlyArray<SelectionNode>,
  label: string,
): SelectionNode[] {
  return [
    {
      kind: Kind.INLINE_FRAGMENT,
      directives: [
        {
          kind: Kind.DIRECTIVE,
          name: { kind: Kind.NAME, value: 'defer' },
          arguments: [
            {
              kind: Kind.ARGUMENT,
              name: { kind: Kind.NAME, value: 'label' },
              value: { kind: Kind.STRING, value: label },
            },
          ],
        },
      ],
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [...selections],
      },
    },
  ];
}
