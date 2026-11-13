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
    return { ...node, type: mapTypeNode(node.type, ifaceNames) };
  }
  if (node.kind === Kind.LIST_TYPE) {
    return { ...node, type: mapTypeNode(node.type, ifaceNames) };
  }
  return node;
}

/**
 * Prepare a Mesh connectors supergraph for Apollo Router.
 *
 * Router 2.19 rejects OData-style `implements I*` interfaces in join__directive
 * supergraphs (`Person implements IPerson does not refer to an existing interface`).
 * Hive accepts the same SDL — so we only rewrite for the Router runner:
 * - Flatten `I*` interfaces onto concrete types / rename return types
 * - Drop root fields that are not Connectors-backed (unbound Mesh residuals)
 */
export function prepareSupergraphForApolloRouter(supergraphSdl: string): string {
  if (!supergraphSdl.includes('specs.apollo.dev/connect')) {
    return supergraphSdl;
  }
  const doc = parse(supergraphSdl, { noLocation: true });
  const ifaceMap = new Map<string, (typeof doc.definitions)[number]>();
  for (const def of doc.definitions) {
    if (def.kind === Kind.INTERFACE_TYPE_DEFINITION) {
      ifaceMap.set(def.name.value, def);
    }
  }
  if (!ifaceMap.size) {
    // Still strip non-connect roots when present.
  }
  const ifaceNames = new Set(ifaceMap.keys());

  const next = visit(doc, {
    InterfaceTypeDefinition() {
      return null;
    },
    ObjectTypeDefinition(node) {
      let fields = [...(node.fields || [])];
      if (node.name.value === 'Query' || node.name.value === 'Mutation') {
        fields = fields.filter(f => hasConnectJoinDirective(f.directives));
      }
      const impl = (node.interfaces || []).map(i => i.name.value);
      const existing = new Set(fields.map(f => f.name.value));
      for (const iname of impl) {
        const idef = ifaceMap.get(iname);
        if (!idef || idef.kind !== Kind.INTERFACE_TYPE_DEFINITION) continue;
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
        interfaces: [],
        directives: (node.directives || []).filter(d => d.name.value !== 'join__implements'),
        fields: fields.map(f => ({
          ...f,
          type: mapTypeNode(f.type, ifaceNames),
          // Drop field args on non-root types — Connectors reject them on entity fields.
          arguments:
            node.name.value === 'Query' || node.name.value === 'Mutation' ? f.arguments : [],
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
