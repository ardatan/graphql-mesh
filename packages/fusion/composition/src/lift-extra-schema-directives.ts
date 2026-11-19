import type {
  ConstArgumentNode,
  ConstDirectiveNode,
  ConstValueNode,
  DefinitionNode,
  DocumentNode,
  EnumTypeDefinitionNode,
  StringValueNode,
} from 'graphql';
import { Kind, parse, print, visit } from 'graphql';
import { isMeshSpecLinkUrl, MESH_CORE_SPEC_URL, parseMeshSpecUrl } from '@graphql-mesh/utils';
import { astFromValueUntyped } from '@graphql-tools/utils';
import { prepareJoinDirectiveArgs } from './ast-from-value-block.js';

type LiftedOccurrence = Record<string, unknown> & {
  /** Owning subgraph name from co-located `@transport(subgraph:)` in the same extras blob. */
  __meshSubgraph?: string;
};

const JOIN_DIRECTIVE_DEFS = /* GraphQL */ `
  directive @join__directive(
    graphs: [join__Graph!]
    name: String!
    args: join__DirectiveArguments
  ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION
  scalar join__DirectiveArguments
`;

const CONNECT_SPEC_PREFIX = 'https://specs.apollo.dev/connect';

// Shared Mesh `@transport` — kind-specific fields live under `options`.
const DEFAULT_TRANSPORT_DIRECTIVE_SDL = /* GraphQL */ `
  scalar TransportOptions
  directive @transport(
    subgraph: String!
    kind: String!
    location: String
    headers: [[String]]
    options: TransportOptions
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
  const liftedByName = new Map<string, LiftedOccurrence[]>();

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

  const subgraphToGraphEnum = readJoinGraphNameToEnum(document);
  const existingDirectiveNames = new Set<string>();
  let hasObjMap = false;
  let hasTransportOptions = false;
  let hasSourceHTTP = false;
  let hasJoinDirectiveArgs = false;
  for (const def of document.definitions) {
    if (def.kind === Kind.DIRECTIVE_DEFINITION) {
      existingDirectiveNames.add(def.name.value);
    } else if (def.kind === Kind.SCALAR_TYPE_DEFINITION && def.name.value === 'ObjMap') {
      hasObjMap = true;
    } else if (def.kind === Kind.SCALAR_TYPE_DEFINITION && def.name.value === 'TransportOptions') {
      hasTransportOptions = true;
    } else if (
      def.kind === Kind.SCALAR_TYPE_DEFINITION &&
      def.name.value === 'join__DirectiveArguments'
    ) {
      hasJoinDirectiveArgs = true;
    } else if (def.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION && def.name.value === 'SourceHTTP') {
      hasSourceHTTP = true;
    }
  }

  const schemaDirectiveNodes: ConstDirectiveNode[] = [];
  let emittedJoinSource = false;
  let emittedRawSource = false;
  for (const [directiveName, occurrences] of liftedByName) {
    for (const occurrence of occurrences) {
      if (directiveName === 'source') {
        const { __meshSubgraph, ...args } = occurrence;
        const graphEnum = __meshSubgraph ? subgraphToGraphEnum.get(__meshSubgraph) : undefined;
        if (graphEnum) {
          // Preserve owning graph through lift so finalize does not re-guess when
          // multiple graphs share a source name (incl. same baseURL, different headers).
          schemaDirectiveNodes.push(buildJoinDirective(graphEnum, 'source', args));
          emittedJoinSource = true;
          continue;
        }
        schemaDirectiveNodes.push(buildConstDirective('source', args));
        emittedRawSource = true;
        continue;
      }
      const { __meshSubgraph: _ignored, ...args } = occurrence;
      schemaDirectiveNodes.push(buildConstDirective(directiveName, args));
    }
  }

  const definitionsToAppend: DefinitionNode[] = [];
  if (liftedByName.has('transport') && !existingDirectiveNames.has('transport')) {
    // Prefer shared TransportOptions; skip duplicate scalar if already present.
    const transportSdl = hasTransportOptions
      ? DEFAULT_TRANSPORT_DIRECTIVE_SDL.replace(/^\s*scalar TransportOptions\s*$/m, '')
      : DEFAULT_TRANSPORT_DIRECTIVE_SDL;
    definitionsToAppend.push(...parse(transportSdl, { noLocation: true }).definitions);
    hasTransportOptions = true;
    existingDirectiveNames.add('transport');
  }
  // Only add raw `@source` def when we still emit raw usages (finalize will rewrite).
  if (emittedRawSource && !existingDirectiveNames.has('source')) {
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
  if (emittedJoinSource && !existingDirectiveNames.has('join__directive')) {
    const joinSdl = hasJoinDirectiveArgs
      ? JOIN_DIRECTIVE_DEFS.replace(/^\s*scalar join__DirectiveArguments\s*$/m, '')
      : JOIN_DIRECTIVE_DEFS;
    definitionsToAppend.push(...parse(joinSdl, { noLocation: true }).definitions);
    existingDirectiveNames.add('join__directive');
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
          // Keep `@source` on the connect `@link` import only when raw usages remain.
          liftedSource: emittedRawSource,
        }),
        stillHasExtrasUsage,
      );
    },
    SchemaExtension(node) {
      return stripComposeDirectiveExtras(
        rewriteSchemaLinks(node, {
          stillHasExtrasUsage,
          liftedTransport: liftedByName.has('transport'),
          liftedSource: emittedRawSource,
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
  liftedByName: Map<string, LiftedOccurrence[]>,
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
    const blob = value as Record<string, unknown>;
    // Prefer Compose-stamped owner (no `@transport(kind: "connect")` required).
    // Fall back to leftover `@transport(subgraph:)` for older extras blobs.
    const subgraphOwner =
      readSubgraphFromMeshComposeEntries(blob.meshComposeSubgraph) ||
      readSubgraphFromTransportEntries(
        Array.isArray(blob.transport) ? blob.transport : blob.transport ? [blob.transport] : [],
      );

    for (const [name, occurrences] of Object.entries(blob)) {
      if (name === 'meshComposeSubgraph') {
        // Compose-only attribution — do not lift onto the supergraph schema.
        continue;
      }
      const list = Array.isArray(occurrences) ? occurrences : [occurrences];
      const bucket = liftedByName.get(name) || [];
      for (const item of list) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          continue;
        }
        const occurrence: LiftedOccurrence = { ...(item as Record<string, unknown>) };
        // Pair SCHEMA `@source` with the owning subgraph from the same extras blob.
        if (name === 'source' && subgraphOwner) {
          occurrence.__meshSubgraph = subgraphOwner;
        }
        bucket.push(occurrence);
      }
      liftedByName.set(name, bucket);
    }
  }
}

function readSubgraphFromMeshComposeEntries(value: unknown): string | undefined {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }
    const name = (entry as Record<string, unknown>).name;
    if (typeof name === 'string' && name) {
      return name;
    }
  }
  return undefined;
}

function readSubgraphFromTransportEntries(transportList: unknown[]): string | undefined {
  for (const entry of transportList) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }
    const subgraph = (entry as Record<string, unknown>).subgraph;
    if (typeof subgraph === 'string' && subgraph) {
      return subgraph;
    }
  }
  return undefined;
}

function readJoinGraphNameToEnum(document: DocumentNode): Map<string, string> {
  const map = new Map<string, string>();
  for (const def of document.definitions) {
    if (def.kind !== Kind.ENUM_TYPE_DEFINITION || def.name.value !== 'join__Graph') {
      continue;
    }
    for (const value of (def as EnumTypeDefinitionNode).values || []) {
      const graphDir = value.directives?.find(d => d.name.value === 'join__graph');
      const name = graphDir ? getStringArg(graphDir, 'name') : value.name.value;
      if (name) {
        map.set(name, value.name.value);
      }
    }
  }
  return map;
}

function buildJoinDirective(
  graphEnum: string,
  name: string,
  args: Record<string, unknown>,
): ConstDirectiveNode {
  return {
    kind: Kind.DIRECTIVE,
    name: { kind: Kind.NAME, value: 'join__directive' },
    arguments: [
      {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: 'graphs' },
        value: {
          kind: Kind.LIST,
          values: [{ kind: Kind.ENUM, value: graphEnum }],
        },
      },
      {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: 'name' },
        value: { kind: Kind.STRING, value: name },
      },
      {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: 'args' },
        value: astFromValueUntyped(prepareJoinDirectiveArgs(args)) as ConstValueNode,
      },
    ],
  };
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
      if (isMeshSpecLinkUrl(url)) {
        // `@transport` lives on the core Mesh link only — never on protocol links
        // (thrift/sql/…). Also rewrite core links for `@extraSchemaDefinitionDirective`.
        const parsed = parseMeshSpecUrl(url);
        if (parsed?.name === 'core' || url === MESH_CORE_SPEC_URL) {
          return rewriteMeshLink(directive, opts);
        }
        return directive;
      }
      if (url.startsWith(CONNECT_SPEC_PREFIX) && opts.liftedSource) {
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
