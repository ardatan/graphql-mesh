import {
  getNamedType,
  isEnumType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isUnionType,
  isWrappingType,
  type GraphQLOutputType,
  type GraphQLSchema,
} from 'graphql';

export type FileOutput = { file: string; content: string };

export function generatedMarkdown(schema: GraphQLSchema): FileOutput[] {
  const result: FileOutput[] = [];

  for (const [typeName, type] of Object.entries(schema.getTypeMap())) {
    // GraphQL 17 may leave empty directive lists undefined.
    const directives = type.astNode?.directives || [];
    if (isObjectType(type) && directives.some(d => d.name.value === 'md')) {
      result.push({
        file: `${typeName}.generated.md`,
        content: `${type.description ? type.description + '\n\n' : ''}${transformTypeToMdFormat(type)}`,
      });
    }
  }

  return result;
}

export function transformTypeToMdFormat(
  type: GraphQLOutputType,
  level = 0,
  path: Set<string> = new Set(),
): string {
  if (isWrappingType(type)) {
    return transformTypeToMdFormat(type.ofType, level, path);
  }

  if (isObjectType(type) || isInterfaceType(type)) {
    // Recursive GraphQL types (e.g. `type Tree { child: Tree }`) — emit a finite
    // reference when the current path already contains this type.
    if (path.has(type.name)) {
      return `Object (\`${type.name}\`)`;
    }
    const nextPath = new Set(path);
    nextPath.add(type.name);
    const fields: string[] = [];

    for (const [fieldName, field] of Object.entries(type.getFields())) {
      const baseField = `${indent(level)}* \`${fieldName}\``;
      const named = getNamedType(field.type);
      const hasChildObject = isObjectType(named);
      const hasMultipleTypes = isUnionType(named);
      const isRequired =
        isNonNullType(field.type) || (isListType(field.type) && isNonNullType(field.type.ofType));
      const isList =
        isListType(field.type) || (isNonNullType(field.type) && isListType(field.type.ofType));
      const typeToUse = transformTypeToMdFormat(field.type, level + 1, nextPath);

      if (hasChildObject) {
        fields.push(
          `${baseField} (type: \`${isList ? 'Array of Object' : 'Object'}\`${isRequired ? ', required' : ''})${
            field.description ? ' - ' + field.description : ''
          }: ${typeToUse}`,
        );
      } else if (hasMultipleTypes) {
        fields.push(
          `${baseField} - ${field.description ? ' - ' + field.description : ''}${
            isRequired ? ' (required)' : ''
          }${isList ? ' Array' : ' One'} of: ${typeToUse}`,
        );
      } else {
        fields.push(
          `${baseField} (type: \`${isList ? 'Array of ' : ''}${typeToUse}\`${
            isRequired ? ', required' : ''
          })${field.description ? ' - ' + field.description : ''}`,
        );
      }
    }
    return '\n' + fields.join('\n');
  }

  if (isEnumType(type)) {
    return `String (${type
      .getValues()
      .map(v => v.name)
      .join(' | ')})`;
  }

  if (isUnionType(type)) {
    return (
      '\n' +
      type
        .getTypes()
        .map(t => {
          const content = transformTypeToMdFormat(t, level + 1);
          if (isObjectType(t)) {
            return `${indent(level)}* \`object\`: ${content}`;
          }
          return `${indent(level)}* \`${content}\``;
        })
        .join('\n')
    );
  }

  return type.toString();
}

function indent(num: number): string {
  return num === 0 ? '' : '  '.repeat(num);
}
