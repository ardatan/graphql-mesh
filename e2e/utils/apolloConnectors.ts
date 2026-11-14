import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir } from 'node:fs/promises';
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
  type NamedTypeNode,
  type NonNullTypeNode,
  type TypeNode,
} from 'graphql';
import { fetch } from '@whatwg-node/fetch';

const execFileAsync = promisify(execFile);

export const APOLLO_ROUTER_VERSION = '2.19.0';

/**
 * Ensure an Apollo Router binary is available for e2e (download once into /tmp).
 * Mesh compose already emits a Router-ready connectors supergraph — no Rover step.
 */
export async function ensureApolloRouterBinary(
  version = process.env.APOLLO_ROUTER_VERSION || APOLLO_ROUTER_VERSION,
): Promise<string> {
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

function hasConnectJoinDirective(directives: readonly ConstDirectiveNode[] | undefined): boolean {
  return (directives || []).some(
    d =>
      d.name.value === 'join__directive' &&
      d.arguments?.some(
        a => a.name.value === 'name' && a.value.kind === Kind.STRING && a.value.value === 'connect',
      ),
  );
}

function mapNamedType(node: NamedTypeNode, ifaceNames: Set<string>): NamedTypeNode {
  if (!ifaceNames.has(node.name.value)) {
    return node;
  }
  const concrete = node.name.value.startsWith('I') ? node.name.value.slice(1) : node.name.value;
  return {
    ...node,
    name: { kind: Kind.NAME, value: concrete },
  };
}

function mapTypeNode(node: TypeNode, ifaceNames: Set<string>): TypeNode {
  if (node.kind === Kind.NAMED_TYPE) {
    return mapNamedType(node, ifaceNames);
  }
  if (node.kind === Kind.NON_NULL_TYPE) {
    const inner = mapTypeNode(node.type, ifaceNames);
    // NonNull cannot wrap NonNull in the GraphQL AST.
    if (inner.kind === Kind.NON_NULL_TYPE) {
      return inner;
    }
    return { kind: Kind.NON_NULL_TYPE, type: inner };
  }
  if (node.kind === Kind.LIST_TYPE) {
    const inner = mapTypeNode(node.type, ifaceNames);
    return {
      kind: Kind.LIST_TYPE,
      type: inner as NamedTypeNode | NonNullTypeNode,
    };
  }
  return node;
}

/**
 * Prepare a Mesh connectors supergraph for Apollo Router.
 *
 * Prefer emitting Router-native subgraph SDL at compose time (OData no longer
 * synthesizes `IFoo` + `Foo implements IFoo` for non-abstract bases). This helper
 * remains as a safety net for older composed artifacts that still contain that
 * pattern — Router 2.19 rejects `Person implements IPerson` in join__directive
 * supergraphs. When the composed SDL has no such interfaces, this is a no-op so
 * Hive and Router execute the same supergraph bytes.
 */
export function prepareSupergraphForApolloRouter(supergraphSdl: string): string {
  if (!supergraphSdl.includes('specs.apollo.dev/connect')) {
    return supergraphSdl;
  }
  const doc = parse(supergraphSdl, { noLocation: true });
  const objectNames = new Set<string>();
  for (const def of doc.definitions) {
    if (def.kind === Kind.OBJECT_TYPE_DEFINITION) {
      objectNames.add(def.name.value);
    }
  }
  // Only flatten OData-style `IFoo` interfaces that have a concrete `Foo` sibling.
  // OpenAPI HATEOAS (and similar) use real interfaces like `Product` — keep those.
  const ifaceMap = new Map<string, (typeof doc.definitions)[number]>();
  for (const def of doc.definitions) {
    if (def.kind !== Kind.INTERFACE_TYPE_DEFINITION) continue;
    const name = def.name.value;
    if (!name.startsWith('I')) continue;
    const concrete = name.slice(1);
    if (!concrete || !objectNames.has(concrete)) continue;
    ifaceMap.set(name, def);
  }
  const ifaceNames = new Set(ifaceMap.keys());

  const next = visit(doc, {
    InterfaceTypeDefinition(node) {
      return ifaceMap.has(node.name.value) ? null : node;
    },
    ObjectTypeDefinition(node) {
      let fields = [...(node.fields || [])];
      // Only strip Mesh residual roots when rewriting an OData `I*` schema for Router.
      const odataFlatten = ifaceNames.size > 0;
      if (odataFlatten && (node.name.value === 'Query' || node.name.value === 'Mutation')) {
        fields = fields.filter(f => hasConnectJoinDirective(f.directives));
      }
      const impl = (node.interfaces || []).map(i => i.name.value);
      const existing = new Set(fields.map(f => f.name.value));
      const keptImplements: NamedTypeNode[] = [];
      for (const iname of impl) {
        const idef = ifaceMap.get(iname);
        if (!idef || idef.kind !== Kind.INTERFACE_TYPE_DEFINITION) {
          // Non-OData interface (e.g. Product) — keep implements.
          keptImplements.push({
            kind: Kind.NAMED_TYPE,
            name: { kind: Kind.NAME, value: iname },
          });
          continue;
        }
        for (const f of idef.fields || []) {
          if (existing.has(f.name.value)) continue;
          existing.add(f.name.value);
          fields.push({
            ...f,
            type: mapTypeNode(f.type, ifaceNames),
          });
        }
      }
      return {
        ...node,
        interfaces: keptImplements,
        directives: (node.directives || []).filter(d => {
          if (d.name.value !== 'join__implements') return true;
          const typeArg = d.arguments?.find(a => a.name.value === 'interface');
          if (!typeArg || typeArg.value.kind !== Kind.STRING) return true;
          return !ifaceNames.has(typeArg.value.value);
        }),
        fields: fields.map(f => ({
          ...f,
          type: mapTypeNode(f.type, ifaceNames),
          // OData entity fields with Mesh key-lookup args break Router Connectors.
          arguments:
            !odataFlatten || node.name.value === 'Query' || node.name.value === 'Mutation'
              ? f.arguments
              : [],
        })),
      };
    },
    FieldDefinition(node) {
      return {
        ...node,
        type: mapTypeNode(node.type, ifaceNames),
      };
    },
  });

  return print(next).trim();
}
