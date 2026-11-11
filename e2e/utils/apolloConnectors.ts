import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import {
  Kind,
  parse,
  print,
  visit,
  type ConstDirectiveNode,
  type DirectiveNode,
  type DocumentNode,
} from 'graphql';
import { fetch } from '@whatwg-node/fetch';

const execFileAsync = promisify(execFile);

export const APOLLO_ROUTER_VERSION = '2.19.0';
export const APOLLO_FEDERATION_VERSION = '2.14.1';

export type ApolloConnectorsSubgraph = {
  name: string;
  /** Mesh-annotated subgraph SDL (may carry @extraSchemaDefinitionDirective). */
  sdl: string;
  /** Fallback routing URL when @source baseURL is absent. */
  url?: string;
};

/** Mesh / Hive-only directive *usages* that Apollo Connectors composition must not see. */
const STRIP_USAGE_NAMES = new Set([
  'extraSchemaDefinitionDirective',
  'meshRestOptions',
  'merge',
  'enum',
  'resolveRootField',
  'transport',
  'additionalField',
  'length',
]);

/** Local directive *definitions* Mesh emits — Apollo injects these via `@link(connect/v0.4)`. */
const STRIP_DEFINITION_NAMES = new Set([...STRIP_USAGE_NAMES, 'connect', 'source']);

/** Input/object types Mesh emits for local @connect/@source copies. */
const STRIP_TYPE_NAMES = new Set([
  'ConnectHTTP',
  'SourceHTTP',
  'HTTPHeaderMapping',
  'ConnectorErrors',
  'ObjMap',
  '_DirectiveExtensions',
]);

/**
 * Convert a Mesh connectors subgraph SDL into an Apollo-native connectors subgraph
 * that Rover can compose for Apollo Router.
 */
export function meshSubgraphToApolloConnectorsSdl(meshSdl: string): string {
  const doc = parse(meshSdl, { noLocation: true });
  const sources = extractApolloSources(doc);
  const cleaned = stripMeshArtifacts(doc);
  return print(applyApolloConnectorsSchema(cleaned, sources));
}

function extractApolloSources(doc: DocumentNode): Array<Record<string, unknown>> {
  const sources: Array<Record<string, unknown>> = [];
  visit(doc, {
    Directive(directive) {
      if (directive.name.value !== 'extraSchemaDefinitionDirective') return;
      const directivesArg = directive.arguments?.find(a => a.name.value === 'directives');
      if (!directivesArg || directivesArg.value.kind !== Kind.OBJECT) return;
      const sourceField = directivesArg.value.fields.find(f => f.name.value === 'source');
      if (!sourceField || sourceField.value.kind !== Kind.LIST) return;
      for (const item of sourceField.value.values) {
        if (item.kind === Kind.OBJECT) {
          sources.push(objectValueToJson(item) as Record<string, unknown>);
        }
      }
    },
  });
  return sources;
}

function objectValueToJson(node: any): unknown {
  switch (node.kind) {
    case Kind.OBJECT:
      return Object.fromEntries(
        node.fields.map((f: any) => [f.name.value, objectValueToJson(f.value)]),
      );
    case Kind.LIST:
      return node.values.map(objectValueToJson);
    case Kind.STRING:
    case Kind.BOOLEAN:
    case Kind.ENUM:
      return node.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(node.value);
    case Kind.NULL:
      return null;
    default:
      return null;
  }
}

function filterDirectives(
  directives: readonly DirectiveNode[] | undefined,
): DirectiveNode[] | undefined {
  if (!directives?.length) return directives as DirectiveNode[] | undefined;
  return directives.filter(d => {
    if (STRIP_USAGE_NAMES.has(d.name.value)) return false;
    if (d.name.value === 'composeDirective') {
      const nameArg = d.arguments?.find(a => a.name.value === 'name');
      const raw = nameArg?.value.kind === Kind.STRING ? nameArg.value.value : '';
      const name = raw.replace(/^@/, '');
      // Only keep composeDirective for federation-relevant leftovers; drop Mesh + connect
      // (connect is imported via @link, not composeDirective, for Rover).
      if (STRIP_DEFINITION_NAMES.has(name) || name === 'connect' || name === 'source') {
        return false;
      }
    }
    if (d.name.value === 'link') {
      const urlArg = d.arguments?.find(a => a.name.value === 'url');
      const url = urlArg?.value.kind === Kind.STRING ? urlArg.value.value : '';
      // Drop Mesh spec link; keep Apollo connect/federation/link.
      if (url.includes('the-guild.dev/graphql/mesh')) return false;
    }
    return true;
  });
}

function stripMeshArtifacts(doc: DocumentNode): DocumentNode {
  return visit(doc, {
    Document(node) {
      return {
        ...node,
        definitions: node.definitions.filter(def => {
          if (def.kind === Kind.DIRECTIVE_DEFINITION) {
            return !STRIP_DEFINITION_NAMES.has(def.name.value);
          }
          if (
            def.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION ||
            def.kind === Kind.SCALAR_TYPE_DEFINITION ||
            def.kind === Kind.OBJECT_TYPE_DEFINITION
          ) {
            return !STRIP_TYPE_NAMES.has(def.name.value);
          }
          return true;
        }),
      };
    },
    SchemaDefinition(node) {
      return { ...node, directives: filterDirectives(node.directives) };
    },
    SchemaExtension(node) {
      return { ...node, directives: filterDirectives(node.directives) };
    },
    ObjectTypeDefinition(node) {
      const directives = filterDirectives(node.directives);
      // Apollo Connectors require every root field to be resolved by `@connect`
      // (or appear in a parent selection). Mesh may leave placeholder/dummy fields.
      if (node.name.value === 'Query' || node.name.value === 'Mutation') {
        let fields = (node.fields || []).filter(field =>
          (field.directives || []).some(d => d.name.value === 'connect'),
        );
        // Apollo composition requires at least one Query field; mutation-only Mesh
        // subgraphs get a virtual connector placeholder.
        if (node.name.value === 'Query' && fields.length === 0) {
          fields = parse(
            /* GraphQL */ `
              type Query {
                _apolloConnectorsPlaceholder: String @connect(selection: "$(\\"ok\\")")
              }
            `,
            { noLocation: true },
          ).definitions.find(d => d.kind === Kind.OBJECT_TYPE_DEFINITION)!.fields!;
        }
        return { ...node, directives, fields };
      }
      return { ...node, directives };
    },
    ObjectTypeExtension(node) {
      const directives = filterDirectives(node.directives);
      if (node.name.value === 'Query' || node.name.value === 'Mutation') {
        let fields = (node.fields || []).filter(field =>
          (field.directives || []).some(d => d.name.value === 'connect'),
        );
        if (node.name.value === 'Query' && fields.length === 0) {
          fields = parse(
            /* GraphQL */ `
              type Query {
                _apolloConnectorsPlaceholder: String @connect(selection: "$(\\"ok\\")")
              }
            `,
            { noLocation: true },
          ).definitions.find(d => d.kind === Kind.OBJECT_TYPE_DEFINITION)!.fields!;
        }
        return { ...node, directives, fields };
      }
      return { ...node, directives };
    },
    FieldDefinition(node) {
      return { ...node, directives: filterDirectives(node.directives) };
    },
    ScalarTypeDefinition(node) {
      return { ...node, directives: filterDirectives(node.directives) };
    },
    EnumValueDefinition(node) {
      return { ...node, directives: filterDirectives(node.directives) };
    },
    InputValueDefinition(node) {
      return { ...node, directives: filterDirectives(node.directives) };
    },
  });
}

function applyApolloConnectorsSchema(
  doc: DocumentNode,
  sources: Array<Record<string, unknown>>,
): DocumentNode {
  const connectLink: ConstDirectiveNode = parse(
    /* GraphQL */ `
      schema @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"]) {
        query: Query
      }
    `,
    { noLocation: true },
  ).definitions.find(d => d.kind === Kind.SCHEMA_DEFINITION)!.directives![0];

  const sourceDirs: ConstDirectiveNode[] = sources.map(source => {
    const synthetic = parse(`schema ${formatSourceDirective(source)} { query: Query }`, {
      noLocation: true,
    });
    return synthetic.definitions.find(d => d.kind === Kind.SCHEMA_DEFINITION)!.directives![0];
  });

  let hasSchema = false;
  const definitions = doc.definitions.map(def => {
    if (def.kind !== Kind.SCHEMA_DEFINITION && def.kind !== Kind.SCHEMA_EXTENSION) {
      return def;
    }
    hasSchema = true;
    const withoutConnectLink = (def.directives || []).filter(d => {
      if (d.name.value !== 'link') return true;
      const urlArg = d.arguments?.find(a => a.name.value === 'url');
      const url = urlArg?.value.kind === Kind.STRING ? urlArg.value.value : '';
      return !url.includes('specs.apollo.dev/connect');
    });
    return {
      ...def,
      directives: [...withoutConnectLink, connectLink, ...sourceDirs],
    };
  });

  if (!hasSchema) {
    definitions.unshift({
      kind: Kind.SCHEMA_DEFINITION,
      operationTypes: [
        {
          kind: Kind.OPERATION_TYPE_DEFINITION,
          operation: 'query',
          type: { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, name: 'Query' } },
        },
      ],
      directives: [connectLink, ...sourceDirs],
    });
  }

  return { kind: Kind.DOCUMENT, definitions };
}

function formatSourceDirective(source: Record<string, unknown>): string {
  const http = (source.http || {}) as Record<string, unknown>;
  const parts = [`name: ${JSON.stringify(source.name)}`];
  const httpParts = [`baseURL: ${JSON.stringify(http.baseURL)}`];
  if (Array.isArray(http.headers) && http.headers.length) {
    httpParts.push(
      `headers: [${http.headers
        .map((h: any) => `{name: ${JSON.stringify(h.name)}, value: ${JSON.stringify(h.value)}}`)
        .join(', ')}]`,
    );
  }
  if (http.queryParams != null) {
    httpParts.push(`queryParams: ${JSON.stringify(http.queryParams)}`);
  }
  parts.push(`http: {${httpParts.join(', ')}}`);
  return `@source(${parts.join(', ')})`;
}

export async function ensureApolloRouterBinary(version = APOLLO_ROUTER_VERSION): Promise<string> {
  if (process.env.APOLLO_ROUTER_BIN) {
    return process.env.APOLLO_ROUTER_BIN;
  }
  if (process.platform !== 'linux') {
    throw new Error(
      `Apollo Router e2e downloads a Linux binary; set APOLLO_ROUTER_BIN on ${process.platform}`,
    );
  }
  const cacheDir = join(tmpdir(), `apollo-router-${version}`);
  const binPath = join(cacheDir, 'router');
  try {
    await execFileAsync(binPath, ['--version']);
    return binPath;
  } catch {
    // download
  }
  await mkdir(cacheDir, { recursive: true });
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  const url = `https://github.com/apollographql/router/releases/download/v${version}/router-v${version}-${arch}-unknown-linux-gnu.tar.gz`;
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download Apollo Router: ${res.status} ${url}`);
  }
  const tarPath = join(cacheDir, 'router.tar.gz');
  await pipeline(res.body as any, createWriteStream(tarPath));
  await execFileAsync('tar', ['-xzf', tarPath, '-C', cacheDir, '--strip-components=1']);
  await chmod(binPath, 0o755);
  await execFileAsync(binPath, ['--version']);
  return binPath;
}

export async function ensureRoverBinary(): Promise<string> {
  if (process.env.APOLLO_ROVER_BIN) {
    return process.env.APOLLO_ROVER_BIN;
  }
  const local = join(process.env.HOME || tmpdir(), '.rover', 'bin', 'rover');
  try {
    await execFileAsync(local, ['--version']);
    return local;
  } catch {
    // install
  }
  await execFileAsync('bash', ['-lc', 'curl -sSL https://rover.apollo.dev/nix/latest | sh'], {
    env: {
      ...process.env,
      APOLLO_ELV2_LICENSE: 'accept',
    },
  });
  await execFileAsync(local, ['--version']);
  return local;
}

/**
 * Compose Mesh-generated connectors subgraphs with Rover into an Apollo Router supergraph.
 */
export async function composeApolloConnectorsSupergraph(
  subgraphs: ApolloConnectorsSubgraph[],
  workDir: string,
): Promise<string> {
  const rover = await ensureRoverBinary();
  const subgraphFiles: Record<string, string> = {};
  for (const sg of subgraphs) {
    const apolloSdl = meshSubgraphToApolloConnectorsSdl(sg.sdl);
    const file = join(workDir, `${sg.name}.graphql`);
    await writeFile(file, apolloSdl, 'utf8');
    subgraphFiles[sg.name] = file;
  }

  const supergraphConfig = [
    `federation_version: =${APOLLO_FEDERATION_VERSION}`,
    'subgraphs:',
    ...subgraphs.flatMap(sg => {
      const apolloSdl = meshSubgraphToApolloConnectorsSdl(sg.sdl);
      const routing = extractBaseUrlFromSdl(apolloSdl) || sg.url || 'http://unused';
      return [
        `  ${sg.name}:`,
        `    routing_url: ${JSON.stringify(routing)}`,
        `    schema:`,
        `      file: ${JSON.stringify(subgraphFiles[sg.name])}`,
      ];
    }),
    '',
  ].join('\n');

  const configPath = join(workDir, 'supergraph.yaml');
  const outPath = join(workDir, 'apollo-supergraph.graphql');
  await writeFile(configPath, supergraphConfig, 'utf8');
  await execFileAsync(
    rover,
    ['supergraph', 'compose', '--config', configPath, '--output', outPath],
    {
      env: {
        ...process.env,
        APOLLO_ELV2_LICENSE: 'accept',
        APOLLO_ROVER_ALLOW_AUTOMATIC_DOWNLOAD: 'true',
        APOLLO_TELEMETRY_DISABLED: 'true',
      },
    },
  );
  return outPath;
}

function extractBaseUrlFromSdl(sdl: string): string | undefined {
  const match = sdl.match(/@source\([^)]*baseURL:\s*"([^"]+)"/);
  return match?.[1];
}
