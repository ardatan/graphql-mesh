import { Kind, visit, type ObjectFieldNode, type ValueNode, type VariableNode } from 'graphql';

type VariablePaths = Record<string, Array<Array<string | number>>>;

export function extractVariables(inputValue: ValueNode): {
  inputValue: ValueNode;
  variablePaths: VariablePaths;
} {
  const path: Array<string | number> = [];
  const variablePaths = Object.create(null);

  const keyPathVisitor = {
    enter: (_node: any, key: string | number | undefined) => {
      if (typeof key === 'number') {
        path.push(key);
      }
    },
    leave: (_node: any, key: string | number | undefined) => {
      if (typeof key === 'number') {
        path.pop();
      }
    },
  };

  const fieldPathVisitor = {
    enter: (node: ObjectFieldNode) => {
      path.push(node.name.value);
    },
    leave: () => {
      path.pop();
    },
  };

  const variableVisitor = {
    enter: (node: VariableNode, key: string | number | undefined) => {
      const destinationPath = typeof key === 'number' ? path.concat([key]) : path.slice();
      const existing = variablePaths[node.name.value];
      if (existing) {
        existing.push(destinationPath);
      } else {
        variablePaths[node.name.value] = [destinationPath];
      }
      return {
        kind: Kind.NULL,
      };
    },
  };

  const newInputValue: ValueNode = visit(inputValue, {
    [Kind.OBJECT]: keyPathVisitor,
    [Kind.LIST]: keyPathVisitor,
    [Kind.OBJECT_FIELD]: fieldPathVisitor,
    [Kind.VARIABLE]: variableVisitor,
  });

  return {
    inputValue: newInputValue,
    variablePaths,
  };
}
