import type { ConstValueNode, GraphQLField, GraphQLSchema } from 'graphql';
import { isObjectType, Kind } from 'graphql';
import { astFromType, getDirectivesInExtensions } from '@graphql-tools/utils';

/**
 * Prefer GraphQL `"""` only for real multiline values that round-trip losslessly.
 * Single-line strings (even with embedded `"`) stay as normal `"…"` - no fake
 * multiline blocks. Values with `\r` line endings or leading/trailing blank lines
 * are normalized by GraphQL block-string print/parse, so keep escaped `"…"`.
 */
export function stringValuePrefersBlock(value: string): boolean {
  if (!value.includes('\n') && !value.includes('\r')) {
    return false;
  }
  // Block-string parsing normalizes `\r\n` / `\r` → `\n`.
  if (value.includes('\r')) {
    return false;
  }
  // Block-string dedent strips leading/trailing blank lines.
  const lines = value.split('\n');
  if (lines[0] === '' || lines[lines.length - 1] === '') {
    return false;
  }
  return true;
}

/**
 * `printSchemaWithDirectives` rebuilds directive args via JS and prints strings
 * with escaped `\\n` / `\\"` unless the field `astNode` keeps `StringValue.block: true`.
 * Attach matching AST directive apps so multiline / quote-heavy args (`selection`,
 * `body`, `args`, `isSuccess`, …) print as GraphQL `"""`.
 */
export function preferMultilineDirectiveBlockStrings(schema: GraphQLSchema): GraphQLSchema {
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type)) continue;
    for (const field of Object.values(type.getFields())) {
      attachBlockStringDirectiveAst(field);
    }
  }
  return schema;
}

function attachBlockStringDirectiveAst(field: GraphQLField<any, any>): void {
  const dirs = getDirectivesInExtensions(field);
  if (!dirs?.length) return;
  const directiveNodes = dirs.map(dir => ({
    kind: Kind.DIRECTIVE,
    name: { kind: Kind.NAME, value: dir.name },
    arguments: Object.entries(dir.args ?? {}).flatMap(([argName, argValue]) => {
      const value = constValueNodePreferBlockString(argName, argValue);
      if (value == null) return [];
      return [
        {
          kind: Kind.ARGUMENT,
          name: { kind: Kind.NAME, value: argName },
          value,
        },
      ];
    }),
  })) as NonNullable<typeof field.astNode>['directives'];
  // Preserve existing type/args AST - a placeholder `String` type broke compose
  // (`getDirectiveExtensions` WeakMap on bad nodes from graphql-compose fields).
  if (field.astNode) {
    field.astNode = {
      ...field.astNode,
      directives: directiveNodes,
    };
    return;
  }
  field.astNode = {
    kind: Kind.FIELD_DEFINITION,
    name: { kind: Kind.NAME, value: field.name },
    type: astFromType(field.type),
    directives: directiveNodes,
  };
}

function constValueNodePreferBlockString(argName: string, value: unknown): ConstValueNode | null {
  if (value === null) {
    return { kind: Kind.NULL };
  }
  if (value === undefined) {
    return null;
  }
  if (typeof value === 'boolean') {
    return { kind: Kind.BOOLEAN, value };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const asInt = Number.isInteger(value);
    return {
      kind: asInt ? Kind.INT : Kind.FLOAT,
      value: String(value),
    };
  }
  if (typeof value === 'string') {
    // `@thrift__rpc(messageType:)` is an enum - print bare CALL/ONEWAY.
    if (argName === 'messageType') {
      return { kind: Kind.ENUM, value };
    }
    return {
      kind: Kind.STRING,
      value,
      block: stringValuePrefersBlock(value),
    };
  }
  if (Array.isArray(value)) {
    return {
      kind: Kind.LIST,
      values: value
        .map(item => constValueNodePreferBlockString('', item))
        .filter((v): v is ConstValueNode => v != null),
    };
  }
  if (typeof value === 'object') {
    return {
      kind: Kind.OBJECT,
      fields: Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
        const childNode = constValueNodePreferBlockString(key, child);
        if (childNode == null) return [];
        return [
          {
            kind: Kind.OBJECT_FIELD,
            name: { kind: Kind.NAME, value: key },
            value: childNode,
          },
        ];
      }),
    };
  }
  return null;
}

/**
 * Format a Connectors / SQL-style mapping string for a readable `"""` block:
 * indent body lines; for single-line values prefix a newline so the printer
 * emits a multiline `"""` block (not `"""value"""`) without a trailing blank.
 */
export function blockStringArg(body: string): string {
  let start = 0;
  let end = body.length;
  while (start < end && body.charCodeAt(start) === 10) start++;
  while (end > start && body.charCodeAt(end - 1) === 10) end--;
  const trimmed = start === 0 && end === body.length ? body : body.slice(start, end);
  if (!trimmed) return trimmed;
  const indented = trimmed
    .split('\n')
    .map(line => (line.length ? `  ${line}` : line))
    .join('\n');
  return indented.includes('\n') ? indented : `\n${indented}`;
}
