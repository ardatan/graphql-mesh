import {
  createExecutableResolverOperationNode,
  ExecutableResolverOperationNode,
} from './execution.js';
import { parseAndCache, printCached } from './parseAndPrintWithCache.js';
import { ResolverOperationNode } from './query-planning.js';

export interface SerializedResolverOperationNode {
  id?: number;
  subgraph: string;
  resolverOperationDocument: string;
  resolverDependencies?: SerializedResolverOperationNode[];
  resolverDependencyFieldMap?: Record<string, SerializedResolverOperationNode[]>;
  batch?: boolean;
  defer?: boolean;
}

export function serializeResolverOperationNode(
  resolverOperationNode: ResolverOperationNode & { id?: number },
) {
  const serializedNode: SerializedResolverOperationNode = {
    subgraph: resolverOperationNode.subgraph,
    resolverOperationDocument: printCached(resolverOperationNode.resolverOperationDocument),
  };

  if (resolverOperationNode.id != null) {
    serializedNode.id = resolverOperationNode.id;
  }

  if (resolverOperationNode.resolverDependencies.length) {
    serializedNode.resolverDependencies = resolverOperationNode.resolverDependencies.map(
      serializeResolverOperationNode,
    );
  }
  if (resolverOperationNode.resolverDependencyFieldMap.size) {
    serializedNode.resolverDependencyFieldMap = Object.fromEntries(
      [...resolverOperationNode.resolverDependencyFieldMap.entries()].map(([key, value]) => [
        key,
        value.map(serializeResolverOperationNode),
      ]),
    );
  }

  if (resolverOperationNode.batch) {
    serializedNode.batch = true;
  }

  if (resolverOperationNode.defer) {
    serializedNode.defer = true;
  }

  return serializedNode;
}

export function deserializeResolverOperationNode(
  serializedResolverOperationNode: SerializedResolverOperationNode,
): ResolverOperationNode {
  const resolverOperationNode = {
    subgraph: serializedResolverOperationNode.subgraph,
    resolverOperationDocument: parseAndCache(
      serializedResolverOperationNode.resolverOperationDocument,
    ),
  } as ResolverOperationNode;

  if (serializedResolverOperationNode.resolverDependencies) {
    resolverOperationNode.resolverDependencies =
      serializedResolverOperationNode.resolverDependencies.map(deserializeResolverOperationNode);
  } else {
    resolverOperationNode.resolverDependencies = [];
  }

  if (serializedResolverOperationNode.resolverDependencyFieldMap) {
    resolverOperationNode.resolverDependencyFieldMap = new Map(
      Object.entries(serializedResolverOperationNode.resolverDependencyFieldMap).map(
        ([key, value]) => [key, value.map(deserializeResolverOperationNode)],
      ),
    );
  } else {
    resolverOperationNode.resolverDependencyFieldMap = new Map();
  }

  if (serializedResolverOperationNode.batch) {
    resolverOperationNode.batch = true;
  }

  if (serializedResolverOperationNode.defer) {
    resolverOperationNode.defer = true;
  }

  return resolverOperationNode;
}

export function deserializeResolverOperationNodeExecutable(
  serializedNode: SerializedResolverOperationNode,
) {
  return createExecutableResolverOperationNode(deserializeResolverOperationNode(serializedNode), 0);
}

export function serializeExecutableResolverOperationNode(
  executableResolverOperationNode: ExecutableResolverOperationNode,
) {
  return serializeResolverOperationNode(executableResolverOperationNode);
}
