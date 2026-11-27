import type { ReactNode } from 'react';

/**
 * Reusable Mesh v2 directive / API term link: hover shows a short description,
 * click jumps to `/v2/directives#...` (or another docs page).
 */

const DIRECTIVES = {
  connect: {
    label: '@connect',
    anchor: 'connect',
    description: 'HTTP/REST Connectors mapping (source, http, selection, entity).',
  },
  source: {
    label: '@source',
    anchor: 'connect',
    description: 'Named HTTP source for @connect (HTTP/REST Connectors).',
  },
  merge: {
    label: '@merge',
    anchor: 'merge',
    description:
      'Mesh core list/batch entity hop (keyField / keyArg); prefer Federation @lookup for one-object entry fields.',
  },
  lookup: {
    label: '@lookup',
    anchor: 'lookup',
    description:
      'Federation Spec entity recall on a Query field (import from graphql-federation-spec/draft).',
  },
  is: {
    label: '@is',
    anchor: 'lookup',
    description: 'Federation Spec: map a @lookup argument onto an entity field selection.',
  },
  internal: {
    label: '@internal',
    anchor: 'lookup',
    description: 'Federation Spec: hide a lookup field/type from the client-facing schema.',
  },
  transport: {
    label: '@transport',
    anchor: 'transport',
    description: 'Schema stamp: which Mesh transport Hive Gateway loads.',
  },
  sql__query: {
    label: '@sql',
    anchor: 'sql',
    description:
      'SQL SELECT mapping via @sql(kind: ROW|ROWS|...) (table, where, selection, entity).',
  },
  sql__mutation: {
    label: '@sql',
    anchor: 'sql',
    description: 'SQL INSERT / UPDATE / DELETE via @sql(kind: INSERT|UPDATE|DELETE).',
  },
  sql__relation: {
    label: '@sql',
    anchor: 'sql',
    description: 'SQL FK / join navigation via @sql on object fields.',
  },
  sql: {
    label: '@sql',
    anchor: 'sql',
    description: 'SQL protocol directive (kind discriminator for query / mutation / relation).',
  },
  mongo: {
    label: '@mongo__*',
    anchor: 'mongo',
    description: 'MongoDB op directives (@mongo__findOne, ...) with query / selection binders.',
  },
  protobuf__rpc: {
    label: '@protobuf__rpc',
    anchor: 'protobuf',
    description: 'gRPC / Protobuf RPC mapping (service, method, args, selection).',
  },
  thrift__rpc: {
    label: '@thrift__rpc',
    anchor: 'thrift',
    description: 'Thrift binary RPC mapping (args, selection, throws).',
  },
  key: {
    label: '@key',
    anchor: 'federation',
    description: 'Federation entity key (often resolvable: false on join stubs).',
  },
  composeDirective: {
    label: '@composeDirective',
    anchor: 'federation',
    description: 'Which imported directives survive composition.',
  },
  link: {
    label: '@link',
    anchor: 'link',
    description: 'Import directive definitions from a spec URL.',
  },
  resolveTo: {
    label: '@resolveTo',
    anchor: 'resolveTo',
    description:
      'Mesh field delegation / join helper (sourceName, sourceFieldName, ...); prefer @key + HTTP/REST Connect or protocol entity maps for new work.',
  },
  pubsubOperation: {
    label: '@pubsubOperation',
    anchor: 'pubsub',
    description: 'Subscribe a field to a pubsub topic (EDFS / webhooks on Hive Gateway).',
  },
  pubsubPublish: {
    label: '@pubsubPublish',
    anchor: 'pubsub',
    description: 'Publish a field result to a pubsub topic after it resolves.',
  },
  skipAuth: {
    label: '@skipAuth',
    anchor: 'auth',
    description: 'Opt out of complete-protection auth on Hive Gateway.',
  },
  rateLimit: {
    label: '@rateLimit',
    anchor: 'rateLimit',
    description: 'Field-level rate limit hint enforced by Hive Gateway.',
  },
  authenticated: {
    label: '@authenticated',
    anchor: 'auth',
    description: 'Federation auth: require an authenticated viewer.',
  },
} as const;

export type DirectiveName = keyof typeof DIRECTIVES;

const API_TERMS = {
  'hive-gateway': {
    label: 'Hive Gateway',
    href: '/v2/serve/hive-gateway',
    description: 'Preferred Mesh runtime (JavaScript / TypeScript gateway).',
  },
  'apollo-router': {
    label: 'Apollo Router',
    href: '/v2/serve/apollo-router',
    description: 'Peer runtime for Connect-compatible Mesh supergraphs.',
  },
  compose: {
    label: 'Mesh Compose',
    href: '/v2/compose',
    description:
      'Composition via Mesh Compose: loaders and hand-written SDL -> subgraph / supergraph.',
  },
  'reading-sdl': {
    label: 'Reading generated SDL',
    href: '/v2/guides/reading-generated-sdl',
    description: 'How to recognize transports, Connect, keys, and selection on emitted SDL.',
  },
} as const;

export type ApiTermName = keyof typeof API_TERMS;

/** Product concepts -> `/v2/concepts/*` (hover description, click for page). */
const CONCEPTS = {
  mesh: {
    label: 'Mesh',
    href: '/v2/concepts/mesh',
    description: 'Federation framework: sources or SDL -> subgraphs, composition, transports.',
  },
  loaders: {
    label: 'Loaders',
    href: '/v2/concepts/loaders',
    description: 'Omnigraph packages that emit subgraph SDL from upstreams (not runtime fetch).',
  },
  transports: {
    label: 'Transports',
    href: '/v2/concepts/transports',
    description: 'Gateway runtime packages that execute Mesh / Connect directives upstream.',
  },
  connectors: {
    label: 'HTTP/REST Connectors',
    href: '/v2/concepts/connectors',
    description: 'HTTP/REST Connectors: @connect / @source mapping (not Mesh-only protocols).',
  },
  federation: {
    label: 'Federation',
    href: '/v2/concepts/federation',
    description: 'Standardized type merging: entities/@key plus a federation gateway runtime.',
  },
  stitching: {
    label: 'Schema Stitching',
    href: '/v2/concepts/stitching',
    description:
      'Programmatic type-merging runtime (stitchSchemas); can run Federation. Not Schema Stitching Directives.',
  },
  gateway: {
    label: 'Gateway',
    href: '/v2/concepts/gateway',
    description: 'Runtime that executes the graph (federation gateway peers in Mesh v2).',
  },
  composition: {
    label: 'Composition',
    href: '/v2/concepts/composition',
    description: 'Combining subgraph SDL into a supergraph (Mesh Compose, Hive, Rover, ...).',
  },
  'schema-registry': {
    label: 'Schema registry',
    href: '/v2/concepts/schema-registry',
    description: 'Stores and distributes subgraph / supergraph SDL.',
  },
} as const;

export type ConceptName = keyof typeof CONCEPTS;

/** Protocol families -> `/v2/protocols/{slug}` (hover description, click for page). */
const PROTOCOLS = {
  'http-rest': {
    label: 'HTTP / REST',
    slug: 'http-rest',
    description:
      'HTTP/REST Connectors protocol: OpenAPI, JSON Schema, OData, SOAP-as-Connect (@connect / @source).',
  },
  sql: {
    label: 'SQL',
    slug: 'sql',
    description: 'Mesh SQL protocol: @sql kinds (ROW / ROWS / CRUD), transport-sql (Hive Gateway).',
  },
  mongo: {
    label: 'Mongo',
    slug: 'mongo',
    description: 'Mesh Mongo protocol: @mongo__* ops, transport-mongo (Hive Gateway).',
  },
  neo4j: {
    label: 'Neo4j',
    slug: 'neo4j',
    description:
      'Neo4j protocol: native @neo4j/graphql @node / @relationship; Mesh stamps transport-neo4j.',
  },
  thrift: {
    label: 'Thrift',
    slug: 'thrift',
    description:
      'Thrift protocol: binary @thrift__rpc or TJSON @connect from the same .thrift IDL.',
  },
  protobuf: {
    label: 'Protobuf / gRPC',
    slug: 'protobuf',
    description: 'Protobuf / gRPC protocol: @protobuf__rpc field-number maps, transport-protobuf.',
  },
  graphql: {
    label: 'GraphQL HTTP',
    slug: 'graphql',
    description:
      'GraphQL HTTP / Federation subgraphs: loadGraphQLHTTPSubgraph, transport kind http.',
  },
} as const;

export type ProtocolName = keyof typeof PROTOCOLS;

type RefProps = {
  children?: ReactNode;
  /** Override visible label */
  label?: string;
  className?: string;
};

function RefLink({
  href,
  description,
  children,
  className,
  code = false,
}: {
  href: string;
  description: string;
  children: ReactNode;
  className?: string;
  code?: boolean;
}) {
  const body = code ? (
    <code className="rounded bg-transparent p-0 font-[inherit] text-[0.95em] text-inherit before:content-none after:content-none">
      {children}
    </code>
  ) : (
    children
  );

  return (
    <a
      href={href}
      title={description}
      className={[
        'group/ref relative inline rounded-sm font-medium text-sky-700 underline decoration-sky-700/30 underline-offset-2 transition-colors hover:decoration-sky-700 dark:text-sky-300 dark:decoration-sky-300/40 dark:hover:decoration-sky-300',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {body}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+0.35rem)] left-1/2 z-20 hidden w-max max-w-[16rem] -translate-x-1/2 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-left text-xs font-normal normal-case tracking-normal text-neutral-700 shadow-md group-hover/ref:block dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
      >
        {description}
      </span>
    </a>
  );
}

/** Link a Mesh / Connectors / Federation directive to the reference page. */
export function DirectiveRef({
  name,
  children,
  label,
  className,
}: RefProps & { name: DirectiveName }) {
  const entry = DIRECTIVES[name];
  return (
    <RefLink
      href={`/v2/directives#${entry.anchor}`}
      description={entry.description}
      className={className}
      code
    >
      {children ?? label ?? entry.label}
    </RefLink>
  );
}

/** Link a Mesh v2 API / product term to its docs page. */
export function ApiRef({ name, children, label, className }: RefProps & { name: ApiTermName }) {
  const entry = API_TERMS[name];
  return (
    <RefLink href={entry.href} description={entry.description} className={className}>
      {children ?? label ?? entry.label}
    </RefLink>
  );
}

/** Link a Mesh v2 concept term to `/v2/concepts/...`. */
export function ConceptRef({ name, children, label, className }: RefProps & { name: ConceptName }) {
  const entry = CONCEPTS[name];
  return (
    <RefLink href={entry.href} description={entry.description} className={className}>
      {children ?? label ?? entry.label}
    </RefLink>
  );
}

/** Link a Mesh v2 protocol family to `/v2/protocols/{slug}`. */
export function ProtocolRef({
  name,
  children,
  label,
  className,
}: RefProps & { name: ProtocolName }) {
  const entry = PROTOCOLS[name];
  return (
    <RefLink
      href={`/v2/protocols/${entry.slug}`}
      description={entry.description}
      className={className}
    >
      {children ?? label ?? entry.label}
    </RefLink>
  );
}
