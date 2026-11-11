import type {
  ConstArgumentNode,
  ConstDirectiveNode,
  ConstValueNode,
  DefinitionNode,
  DocumentNode,
  StringValueNode,
} from 'graphql';
import { Kind, parse, print, visit } from 'graphql';
import { astFromValueUntyped } from '@graphql-tools/utils';

const MESH_SPEC_PREFIX = 'https://the-guild.dev/graphql/mesh/spec/';
const CONNECT_SPEC_PREFIX = 'https://specs.apollo.dev/connect';

const DEFAULT_TRANSPORT_DIRECTIVE_SDL = /* GraphQL */ `
  directive @transport(
    subgraph: String
    kind: String
    location: String
    headers: ObjMap
    queryStringOptions: ObjMap
    queryParams: ObjMap
  ) repeatable on SCHEMA
`;

const DEFAULT_APOLLO_SOURCE_DIRECTIVE_SDL = /* GraphQL */ `
  directive @source(name: String!, http: SourceHTTP) repeatable on SCHEMA
`;

/**
 * Guild federation composition cannot keep SCHEMA directive *usages* on the
 * supergraph schema definition. Mesh stores those args on Query via
 * `@extraSchemaDefinitionDirective`, then Hive's `restoreExtraDirectives`
 * rehydrates them into `schema.extensions`.
 *
 * This post-process lifts those SCHEMA directives onto `schema @…` in the
 * printed SDL (and drops the extras wrapper) so Mesh/Hive and other consumers
 * see a clean supergraph without needing the restore hop.
 */
export function liftExtraSchemaDefinitionDirectives(supergraphSdl: string): string {
  if (!supergraphSdl?.includes('extraSchemaDefinitionDirective')) {
    return supergraphSdl;
  }

  const document = parse(supergraphSdl, { noLocation: true });
  const liftedByName = new Map<string, any[]>();

  visit(document, {
    ObjectTypeDefinition(node) {
      collectExtrasFromDirectives(node.directives, liftedByName);
    },
    ObjectTypeExtension(node) {
      collectExtrasFromDirectives(node.directives, liftedByName);
    },
  });

  if (liftedByName.size === 0) {
    return supergraphSdl;
  }

  const existingDirectiveNames = new Set<string>();
  let hasObjMap = false;
  let hasSourceHTTP = false;
  for (const def of document.definitions) {
    if (def.kind === Kind.DIRECTIVE_DEFINITION) {
      existingDirectiveNames.add(def.name.value);
    } else if (def.kind === Kind.SCALAR_TYPE_DEFINITION && def.name.value === 'ObjMap') {
      hasObjMap = true;
    } else if (
      def.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION &&
      def.name.value === 'SourceHTTP'
    ) {
      hasSourceHTTP = true;
    }
  }

  const schemaDirectiveNodes: ConstDirectiveNode[] = [];
  for (const [directiveName, occurrences] of liftedByName) {
    for (const args of occurrences) {
      schemaDirectiveNodes.push(buildConstDirective(directiveName, args));
    }
  }

  const definitionsToAppend: DefinitionNode[] = [];
  if (liftedByName.has('transport') && !existingDirectiveNames.has('transport')) {
    if (!hasObjMap) {
      definitionsToAppend.push(...parse(`scalar ObjMap`, { noLocation: true }).definitions);
      hasObjMap = true;
    }
    definitionsToAppend.push(
      ...parse(DEFAULT_TRANSPORT_DIRECTIVE_SDL, { noLocation: true }).definitions,
    );
    existingDirectiveNames.add('transport');
  }
  if (liftedByName.has('source') && !existingDirectiveNames.has('source')) {
    if (hasSourceHTTP) {
      definitionsToAppend.push(
        ...parse(DEFAULT_APOLLO_SOURCE_DIRECTIVE_SDL, { noLocation: true }).definitions,
      );
    } else {
      if (!hasObjMap) {
        definitionsToAppend.push(...parse(`scalar ObjMap`, { noLocation: true }).definitions);
        hasObjMap = true;
      }
      definitionsToAppend.push(
        ...parse(
          /* GraphQL */ `
            directive @source(name: String!, http: ObjMap) repeatable on SCHEMA
          `,
          { noLocation: true },
        ).definitions,
      );
    }
    existingDirectiveNames.add('source');
  }

  let schemaDirectivesApplied = false;
  let stillHasExtrasUsage = false;

  const stripped = visit(document, {
    SchemaDefinition(node) {
      if (schemaDirectivesApplied) {
        return node;
      }
      schemaDirectivesApplied = true;
      return {
        ...node,
        directives: [...(node.directives || []), ...schemaDirectiveNodes],
      };
    },
    SchemaExtension(node) {
      if (schemaDirectivesApplied) {
        return node;
      }
      schemaDirectivesApplied = true;
      return {
        ...node,
        directives: [...(node.directives || []), ...schemaDirectiveNodes],
      };
    },
    ObjectTypeDefinition(node) {
      return stripExtrasDirective(node);
    },
    ObjectTypeExtension(node) {
      return stripExtrasDirective(node);
    },
  });

  visit(stripped, {
    Directive(node) {
      if (node.name.value === 'extraSchemaDefinitionDirective') {
        stillHasExtrasUsage = true;
      }
    },
  });

  const withLinks = visit(stripped, {
    SchemaDefinition(node) {
      return stripComposeDirectiveExtras(
        rewriteSchemaLinks(node, {
          stillHasExtrasUsage,
          liftedTransport: liftedByName.has('transport'),
          liftedSource: liftedByName.has('source'),
        }),
        stillHasExtrasUsage,
      );
    },
    SchemaExtension(node) {
      return stripComposeDirectiveExtras(
        rewriteSchemaLinks(node, {
          stillHasExtrasUsage,
          liftedTransport: liftedByName.has('transport'),
          liftedSource: liftedByName.has('source'),
        }),
        stillHasExtrasUsage,
      );
    },
    DirectiveDefinition(node) {
      if (!stillHasExtrasUsage && node.name.value === 'extraSchemaDefinitionDirective') {
        return null;
      }
      return node;
    },
    ScalarTypeDefinition(node) {
      if (!stillHasExtrasUsage && node.name.value === '_DirectiveExtensions') {
        return null;
      }
      return node;
    },
  });

  const finalDocument: DocumentNode = definitionsToAppend.length
    ? {
        ...withLinks,
        definitions: [...withLinks.definitions, ...definitionsToAppend],
      }
    : withLinks;

  return print(finalDocument).trim();
}

function collectExtrasFromDirectives(
  directives: readonly ConstDirectiveNode[] | undefined,
  liftedByName: Map<string, any[]>,
) {
  if (!directives) {
    return;
  }
  for (const directive of directives) {
    if (directive.name.value !== 'extraSchemaDefinitionDirective') {
      continue;
    }
    const directivesArg = directive.arguments?.find(arg => arg.name.value === 'directives');
    if (!directivesArg) {
      continue;
    }
    const value = constValueToJs(directivesArg.value);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    for (const [name, occurrences] of Object.entries(value as Record<string, unknown>)) {
      const list = Array.isArray(occurrences) ? occurrences : [occurrences];
      const bucket = liftedByName.get(name) || [];
      bucket.push(...list);
      liftedByName.set(name, bucket);
    }
  }
}

function stripExtrasDirective<T extends { directives?: readonly ConstDirectiveNode[] }>(
  node: T,
): T {
  if (!node.directives?.some(d => d.name.value === 'extraSchemaDefinitionDirective')) {
    return node;
  }
  return {
    ...node,
    directives: node.directives.filter(d => d.name.value !== 'extraSchemaDefinitionDirective'),
  };
}

function stripComposeDirectiveExtras<T extends { directives?: readonly ConstDirectiveNode[] }>(
  node: T,
  stillHasExtrasUsage: boolean,
): T {
  if (stillHasExtrasUsage || !node.directives) {
    return node;
  }
  return {
    ...node,
    directives: node.directives.filter(directive => {
      if (directive.name.value !== 'composeDirective') {
        return true;
      }
      const nameArg = directive.arguments?.find(arg => arg.name.value === 'name');
      return !(
        nameArg?.value.kind === Kind.STRING &&
        nameArg.value.value === '@extraSchemaDefinitionDirective'
      );
    }),
  };
}

function rewriteSchemaLinks<T extends { directives?: readonly ConstDirectiveNode[] }>(
  node: T,
  opts: {
    stillHasExtrasUsage: boolean;
    liftedTransport: boolean;
    liftedSource: boolean;
  },
): T {
  if (!node.directives) {
    return node;
  }
  return {
    ...node,
    directives: node.directives.map(directive => {
      if (directive.name.value !== 'link') {
        return directive;
      }
      const url = getStringArg(directive, 'url');
      if (!url) {
        return directive;
      }
      if (url.startsWith(MESH_SPEC_PREFIX)) {
        return rewriteMeshLink(directive, opts);
      }
      if (url.includes(CONNECT_SPEC_PREFIX) && opts.liftedSource) {
        return ensureImport(directive, '@source');
      }
      return directive;
    }),
  };
}

function rewriteMeshLink(
  directive: ConstDirectiveNode,
  opts: {
    stillHasExtrasUsage: boolean;
    liftedTransport: boolean;
  },
): ConstDirectiveNode {
  let next = directive;
  if (!opts.stillHasExtrasUsage) {
    next = removeImport(next, '@extraSchemaDefinitionDirective');
  }
  if (opts.liftedTransport) {
    next = ensureImport(next, '@transport');
  }
  return next;
}

function ensureImport(directive: ConstDirectiveNode, importName: string): ConstDirectiveNode {
  const importArg = directive.arguments?.find(arg => arg.name.value === 'import');
  if (!importArg || importArg.value.kind !== Kind.LIST) {
    const newImportArg: ConstArgumentNode = {
      kind: Kind.ARGUMENT,
      name: { kind: Kind.NAME, value: 'import' },
      value: {
        kind: Kind.LIST,
        values: [{ kind: Kind.STRING, value: importName }],
      },
    };
    return {
      ...directive,
      arguments: [
        ...(directive.arguments || []).filter(a => a.name.value !== 'import'),
        newImportArg,
      ],
    };
  }
  const values = [...importArg.value.values];
  const already = values.some(v => {
    if (v.kind === Kind.STRING) {
      return v.value === importName;
    }
    if (v.kind === Kind.OBJECT) {
      const nameField = v.fields.find(f => f.name.value === 'name');
      const asField = v.fields.find(f => f.name.value === 'as');
      const name = nameField?.value.kind === Kind.STRING ? nameField.value.value : undefined;
      const as = asField?.value.kind === Kind.STRING ? asField.value.value : undefined;
      return name === importName || as === importName;
    }
    return false;
  });
  if (already) {
    return directive;
  }
  values.push({ kind: Kind.STRING, value: importName });
  return {
    ...directive,
    arguments: directive.arguments!.map(arg =>
      arg.name.value === 'import'
        ? {
            ...arg,
            value: { kind: Kind.LIST, values },
          }
        : arg,
    ),
  };
}

function removeImport(directive: ConstDirectiveNode, importName: string): ConstDirectiveNode {
  const importArg = directive.arguments?.find(arg => arg.name.value === 'import');
  if (!importArg || importArg.value.kind !== Kind.LIST) {
    return directive;
  }
  const values = importArg.value.values.filter(v => {
    if (v.kind === Kind.STRING) {
      return v.value !== importName;
    }
    if (v.kind === Kind.OBJECT) {
      const nameField = v.fields.find(f => f.name.value === 'name');
      const name = nameField?.value.kind === Kind.STRING ? nameField.value.value : undefined;
      return name !== importName;
    }
    return true;
  });
  if (values.length === importArg.value.values.length) {
    return directive;
  }
  if (values.length === 0) {
    return {
      ...directive,
      arguments: directive.arguments!.filter(arg => arg.name.value !== 'import'),
    };
  }
  return {
    ...directive,
    arguments: directive.arguments!.map(arg =>
      arg.name.value === 'import'
        ? {
            ...arg,
            value: { kind: Kind.LIST, values },
          }
        : arg,
    ),
  };
}

function getStringArg(directive: ConstDirectiveNode, name: string): string | undefined {
  const arg = directive.arguments?.find(a => a.name.value === name);
  if (arg?.value.kind === Kind.STRING) {
    return (arg.value as StringValueNode).value;
  }
  return undefined;
}

function buildConstDirective(
  name: string,
  args: Record<string, unknown> | null | undefined,
): ConstDirectiveNode {
  const argumentNodes: ConstArgumentNode[] = [];
  if (args && typeof args === 'object') {
    for (const [argName, argValue] of Object.entries(args)) {
      if (argValue === undefined) {
        continue;
      }
      const valueNode = astFromValueUntyped(argValue) as ConstValueNode | null;
      if (!valueNode) {
        continue;
      }
      argumentNodes.push({
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: argName },
        value: valueNode,
      });
    }
  }
  return {
    kind: Kind.DIRECTIVE,
    name: { kind: Kind.NAME, value: name },
    arguments: argumentNodes,
  };
}

function constValueToJs(value: ConstValueNode): unknown {
  switch (value.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
    case Kind.ENUM:
      return value.value;
    case Kind.INT:
      return parseInt(value.value, 10);
    case Kind.FLOAT:
      return parseFloat(value.value);
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return value.values.map(constValueToJs);
    case Kind.OBJECT: {
      const obj: Record<string, unknown> = {};
      for (const field of value.fields) {
        obj[field.name.value] = constValueToJs(field.value);
      }
      return obj;
    }
    default:
      return undefined;
  }
}
