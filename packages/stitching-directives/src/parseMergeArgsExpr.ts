import { parseValue, valueFromASTUntyped, type SelectionSetNode } from 'graphql';
import { extractVariables } from './extractVariables.js';
import { getSourcePaths } from './getSourcePaths.js';
import { decodeKeyPath, EXPANSION_PREFIX, preparseMergeArgsExpr } from './preparseMergeArgsExpr.js';
import { propertyTreeFromPaths } from './properties.js';
import { type Expansion, type MappingInstruction, type ParsedMergeArgsExpr } from './types.js';

type VariablePaths = Record<string, Array<Array<string | number>>>;

export function parseMergeArgsExpr(
  mergeArgsExpr: string,
  selectionSet?: SelectionSetNode,
): ParsedMergeArgsExpr {
  const { mergeArgsExpr: newMergeArgsExpr, expansionExpressions } =
    preparseMergeArgsExpr(mergeArgsExpr);

  const inputValue = parseValue(`{ ${newMergeArgsExpr} }`, {
    noLocation: true,
  });

  const { inputValue: newInputValue, variablePaths } = extractVariables(inputValue);

  if (!Object.keys(expansionExpressions).length) {
    if (!Object.keys(variablePaths).length) {
      throw new Error('Merge arguments must declare a key.');
    }

    const mappingInstructions = getMappingInstructions(variablePaths);

    const usedProperties = propertyTreeFromPaths(getSourcePaths(mappingInstructions, selectionSet));

    return {
      args: valueFromASTUntyped(newInputValue) as Record<string, any>,
      usedProperties,
      mappingInstructions,
    };
  }

  const expansionRegEx = new RegExp(`^${EXPANSION_PREFIX}[0-9]+$`);
  for (const variableName in variablePaths) {
    if (!variableName.match(expansionRegEx)) {
      throw new Error('Expansions cannot be mixed with single key declarations.');
    }
  }

  const expansions: Array<Expansion> = [];
  const sourcePaths: Array<Array<string>> = [];
  for (const variableName in expansionExpressions) {
    const str = expansionExpressions[variableName];
    const valuePaths = variablePaths[variableName]!;
    const valuePath = valuePaths[0]!;
    const { inputValue: expansionInputValue, variablePaths: expansionVariablePaths } =
      extractVariables(parseValue(`${str}`, { noLocation: true }));

    if (!Object.keys(expansionVariablePaths).length) {
      throw new Error('Merge arguments must declare a key.');
    }

    const mappingInstructions = getMappingInstructions(expansionVariablePaths);

    const value = valueFromASTUntyped(expansionInputValue);

    sourcePaths.push(...getSourcePaths(mappingInstructions, selectionSet));

    assertNotWithinList(valuePath);
    expansions.push({
      valuePath,
      value,
      mappingInstructions,
    });
  }

  const usedProperties = propertyTreeFromPaths(sourcePaths);

  return {
    args: valueFromASTUntyped(newInputValue) as Record<string, any>,
    usedProperties,
    expansions,
  };
}

function getMappingInstructions(variablePaths: VariablePaths): Array<MappingInstruction> {
  const mappingInstructions: Array<MappingInstruction> = [];
  for (const keyPath in variablePaths) {
    const valuePaths = variablePaths[keyPath]!;
    const splitKeyPath = decodeKeyPath(keyPath).slice(1);

    for (const valuePath of valuePaths) {
      assertNotWithinList(valuePath);
      mappingInstructions.push({
        destinationPath: valuePath,
        sourcePath: splitKeyPath,
      });
    }
  }

  return mappingInstructions;
}

function assertNotWithinList(path: Array<string | number>): asserts path is string[] {
  for (const pathSegment of path) {
    if (typeof pathSegment === 'number') {
      throw new Error('Insertions cannot be made into a list.');
    }
  }
}
