import {
  Kind,
  type ConstArgumentNode,
  type ConstDirectiveNode,
  type ConstObjectValueNode,
  type GraphQLResolveInfo,
  type SelectionSetNode,
  type TypeNode,
} from 'graphql';
import { memoize1, mergeDeep, parseSelectionSet } from '@graphql-tools/utils';

export const getArgsFromKeysForFederation = memoize1(function getArgsFromKeysForFederation(
  representations: readonly any[],
) {
  return { representations };
});

export function projectDataSelectionSet(data: any, selectionSet?: SelectionSetNode): any {
  if (data == null || selectionSet == null || !selectionSet?.selections?.length) {
    return data;
  }
  if (data instanceof Error) {
    return null;
  }
  if (Array.isArray(data)) {
    return data.map(entry => projectDataSelectionSet(entry, selectionSet));
  }
  const projectedData: Record<string, any> = {
    __typename: data.__typename,
  };
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const fieldName = selection.name.value;
      const responseKey = selection.alias?.value || selection.name.value;
      if (Object.prototype.hasOwnProperty.call(data, responseKey)) {
        const projectedKeyData = projectDataSelectionSet(data[responseKey], selection.selectionSet);
        if (projectedData[fieldName]) {
          if (projectedKeyData != null && !(projectedKeyData instanceof Error)) {
            projectedData[fieldName] = mergeDeep(
              [projectedData[fieldName], projectedKeyData],
              undefined,
              true,
              true,
            );
          }
        } else {
          projectedData[fieldName] = projectedKeyData;
        }
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      if (
        selection.typeCondition &&
        projectedData.__typename != null &&
        projectedData.__typename !== selection.typeCondition.name.value
      ) {
        continue;
      }
      Object.assign(
        projectedData,
        mergeDeep(
          [projectedData, projectDataSelectionSet(data, selection.selectionSet)],
          undefined,
          true,
          true,
        ),
      );
    }
  }
  return projectedData;
}

/** Split a simple federation field-set into field names (commas / whitespace). */
function splitSimpleKeyFields(key: string): string[] {
  return key
    .trim()
    .split(/[\s,]+/)
    .map(part => part.trim())
    .filter(Boolean);
}

export function getKeyFnForFederation(typeName: string, keys: string[]) {
  if (keys.some(key => key.includes('{') || key.includes('('))) {
    const parsedSelectionSet = parseSelectionSet(`{${keys.join(' ')}}`, {
      noLocation: true,
    });
    return function keyFn(root: any) {
      if (root == null) {
        return root;
      }
      return projectDataSelectionSet(
        {
          __typename: typeName,
          ...root,
        },
        parsedSelectionSet,
      );
    };
  }
  const allKeyProps = keys.flatMap(key => splitSimpleKeyFields(key));
  if (allKeyProps.length > 1) {
    return function keyFn(root: any) {
      if (root == null) {
        return null;
      }
      return allKeyProps.reduce(
        (prev: any, key) => {
          if (key !== '__typename') {
            prev[key] = root[key];
          }
          return prev;
        },
        { __typename: typeName },
      );
    };
  }
  const keyProp = allKeyProps[0]!;
  return memoize1(function keyFn(root: any) {
    if (root == null) {
      return null;
    }
    const keyPropVal = root[keyProp];
    if (keyPropVal == null) {
      return null;
    }
    return {
      __typename: typeName,
      [keyProp]: keyPropVal,
    };
  });
}

export function getCacheKeyFnFromKey(key: string) {
  if (key.includes('{') || key.includes('(')) {
    const parsedSelectionSet = parseSelectionSet(`{${key}}`, {
      noLocation: true,
    });
    return function cacheKeyFn(root: any) {
      return JSON.stringify(projectDataSelectionSet(root, parsedSelectionSet));
    };
  }
  const keyTrimmed = key.trim();
  const keys = splitSimpleKeyFields(keyTrimmed);
  if (keys.length > 1) {
    return function cacheKeyFn(root: any) {
      // Structured encoding preserves field boundaries and nullish values.
      return JSON.stringify(keys.map(k => root[k]));
    };
  }
  return memoize1(function cacheKeyFn(root: any) {
    const keyVal = root[keyTrimmed];
    if (keyVal == null) {
      return '';
    }
    if (typeof keyVal === 'object') {
      return JSON.stringify(keyVal);
    }
    return keyVal;
  });
}

/** @deprecated Import from `@graphql-tools/stitch` — filter runs inside `stitchSchemas`. */
export { filterInternalFieldsAndTypes } from '@graphql-tools/stitch';

export function getNamedTypeNode(typeNode: TypeNode) {
  if (typeNode.kind !== Kind.NAMED_TYPE) {
    return getNamedTypeNode(typeNode.type);
  }
  return typeNode;
}

export type ProgressiveOverrideHandler = (
  label: string,
  context: any,
  info: GraphQLResolveInfo,
) => boolean;

export function getRngFromEnv() {
  const rngEnv = globalThis.process?.env?.PROGRESSIVE_OVERRIDE_RNG;
  if (rngEnv) {
    const rngSeed = parseFloat(rngEnv);
    if (!isNaN(rngSeed) && rngSeed >= 0 && rngSeed < 1) {
      return rngSeed;
    }
  }
  return undefined;
}

export const progressiveOverridePossibilityHandler = (
  possibility: number,
  getRng: (() => number) | undefined,
) => {
  // Honor a configured RNG of 0 (nullish fallback, not ||).
  const fromEnv = getRngFromEnv();
  const rng =
    fromEnv != null && !Number.isNaN(fromEnv) ? fromEnv : getRng ? getRng() : Math.random();
  return rng < possibility;
};

/**
 * Shared percent decision so destination and source candidates stay complementary
 * for the same field/request instead of drawing independently.
 */
export function createComplementaryPercentOverrideHandlers(
  possibility: number,
  getRng: (() => number) | undefined,
): {
  destination: (context: any, info: GraphQLResolveInfo) => boolean;
  source: (context: any, info: GraphQLResolveInfo) => boolean;
} {
  const decisions = new WeakMap<object, boolean>();
  function decide(context: any, info: GraphQLResolveInfo): boolean {
    const key = (info as any) ?? context ?? {};
    let value = decisions.get(key);
    if (value === undefined) {
      value = progressiveOverridePossibilityHandler(possibility, getRng);
      decisions.set(key, value);
    }
    return value;
  }
  return {
    destination: (context, info) => decide(context, info),
    source: (context, info) => !decide(context, info),
  };
}

export function extractPercentageFromLabel(label: string): number | undefined {
  if (label.startsWith('percent(') && label.endsWith(')')) {
    const regexp = /^percent\((\d+(?:\.\d+)?)\)$/;
    const match = regexp.exec(label);
    const percentageStr = match?.[1];
    if (!percentageStr) {
      throw new Error(`Expected a number in percent(x), got: ${label}`);
    }
    const parsedFloat = parseFloat(percentageStr);
    if (isNaN(parsedFloat)) {
      throw new Error(`Could not parse percentage value from label: ${label}`);
    }
    if (parsedFloat < 0 || parsedFloat > 100) {
      throw new Error(`Expected a percentage value between 0 and 100, got ${parsedFloat}`);
    }
    return parsedFloat;
  }
  return undefined;
}

/**
 * Parses a `@join__directive` AST node into a concrete directive node and the
 * list of subgraph names it applies to.  Returns `null` when the input is not a
 * `@join__directive`, when the required `name` or `graphs` arguments are absent,
 * or when `graphs` contains no entries.
 */
export function parseJoinDirective(
  directiveNode: ConstDirectiveNode,
): { graphNames: string[]; directive: ConstDirectiveNode } | null {
  if (directiveNode.name.value !== 'join__directive') {
    return null;
  }
  if (directiveNode.arguments == null) {
    return null;
  }
  let directiveName: string | undefined;
  let directiveArgsAst: ConstObjectValueNode | undefined;
  const graphNames: string[] = [];
  for (const argumentNode of directiveNode.arguments) {
    if (argumentNode.name.value === 'name' && argumentNode.value.kind === Kind.STRING) {
      directiveName = argumentNode.value.value;
    } else if (argumentNode.name.value === 'args' && argumentNode.value.kind === Kind.OBJECT) {
      directiveArgsAst = argumentNode.value;
    } else if (argumentNode.name.value === 'graphs') {
      // Accept both a singleton enum and a list of enums.
      const graphValueNodes =
        argumentNode.value.kind === Kind.LIST
          ? argumentNode.value.values
          : argumentNode.value.kind === Kind.ENUM
            ? [argumentNode.value]
            : [];
      for (const graphNameNode of graphValueNodes) {
        if (graphNameNode.kind === Kind.ENUM) {
          graphNames.push(graphNameNode.value);
        }
      }
    }
  }
  if (!directiveName || graphNames.length === 0) {
    return null;
  }
  const args: ConstArgumentNode[] | undefined = directiveArgsAst
    ? directiveArgsAst.fields.map(field => ({
        kind: Kind.ARGUMENT,
        name: field.name,
        value: field.value,
      }))
    : undefined;
  return {
    graphNames,
    directive: {
      kind: Kind.DIRECTIVE,
      name: { kind: Kind.NAME, value: directiveName },
      arguments: args,
    },
  };
}

export function filterDirectivesByGraph(
  graphName: string,
  directives: readonly ConstDirectiveNode[] | undefined,
  filterDirectives: string[],
): readonly ConstDirectiveNode[] | undefined {
  if (!directives) {
    return directives;
  }
  const subgraphSpecificDirectives: ConstDirectiveNode[] = [];
  const filteredDirectives = directives.filter(directiveNode => {
    if (filterDirectives.includes(directiveNode.name.value)) {
      return false;
    }
    if (directiveNode.name.value === 'join__directive') {
      const parsed = parseJoinDirective(directiveNode);
      if (parsed?.graphNames.includes(graphName)) {
        subgraphSpecificDirectives.push(parsed.directive);
      }
      return false;
    }
    return true;
  });
  const allDirectives: ConstDirectiveNode[] = [
    ...filteredDirectives,
    ...subgraphSpecificDirectives,
  ];
  if (allDirectives.length === 0) {
    return undefined;
  }
  return allDirectives;
}
