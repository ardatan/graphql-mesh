import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import type { SOAPHeaders } from './SOAPLoader.js';

export const CONNECT_LINK_URL = 'https://specs.apollo.dev/connect/v0.4';

const JSONSelectionScalar = GraphQLString;
const URLPathTemplateScalar = GraphQLString;

const HTTPHeaderMappingInput = new GraphQLInputObjectType({
  name: 'HTTPHeaderMapping',
  fields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    value: { type: GraphQLString },
    from: { type: GraphQLString },
  },
});

const ConnectHTTPInput = new GraphQLInputObjectType({
  name: 'ConnectHTTP',
  fields: {
    GET: { type: URLPathTemplateScalar },
    HEAD: { type: URLPathTemplateScalar },
    POST: { type: URLPathTemplateScalar },
    PUT: { type: URLPathTemplateScalar },
    PATCH: { type: URLPathTemplateScalar },
    DELETE: { type: URLPathTemplateScalar },
    headers: { type: new GraphQLList(new GraphQLNonNull(HTTPHeaderMappingInput)) },
    body: { type: JSONSelectionScalar },
    queryParams: { type: JSONSelectionScalar },
  },
});

const SourceHTTPInput = new GraphQLInputObjectType({
  name: 'SourceHTTP',
  fields: {
    baseURL: { type: new GraphQLNonNull(URLPathTemplateScalar) },
    headers: { type: new GraphQLList(new GraphQLNonNull(HTTPHeaderMappingInput)) },
    queryParams: { type: JSONSelectionScalar },
  },
});

/** SOAP emit `@connect` (subset of transport-connect args). */
export const ConnectDirective = new GraphQLDirective({
  name: 'connect',
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  args: {
    /** `@source(name:)` this connect belongs to. */
    source: { type: GraphQLString },
    /** HTTP method/path/body/headers mapping. */
    http: { type: ConnectHTTPInput },
    /** JSONSelection / XML selection projecting the response. */
    selection: { type: new GraphQLNonNull(JSONSelectionScalar) },
    /** Mark as entity resolver for Mesh `_entities`. */
    entity: { type: GraphQLBoolean },
  },
  isRepeatable: true,
});

/** SOAP emit schema-level `@source`. */
export const SourceDirective = new GraphQLDirective({
  name: 'source',
  locations: [DirectiveLocation.SCHEMA],
  args: {
    /** Source name referenced by `@connect(source:)`. */
    name: { type: new GraphQLNonNull(GraphQLString) },
    /** HTTP base URL + default headers. */
    http: { type: new GraphQLNonNull(SourceHTTPInput) },
  },
  isRepeatable: true,
});

/** SOAP emit schema `@link`. */
export const LinkDirective = new GraphQLDirective({
  name: 'link',
  locations: [DirectiveLocation.SCHEMA],
  args: {
    /** Spec URL. */
    url: { type: new GraphQLNonNull(GraphQLString) },
    /** Imported directive/type names. */
    import: { type: new GraphQLList(GraphQLString) },
  },
  isRepeatable: true,
});

/** Envelope uses `soap:`; never let body/header aliases steal that prefix. */
const RESERVED_XML_PREFIXES = new Set(['xml', 'xmlns', 'soap']);

export function splitSoapEndpoint(endpoint: string | undefined): {
  baseURL: string;
  path: string;
} {
  if (!endpoint) {
    return { baseURL: '', path: '/' };
  }
  try {
    const url = new URL(endpoint);
    return {
      baseURL: url.origin,
      path: `${url.pathname}${url.search}` || '/',
    };
  } catch {
    // Relative / template endpoint - leave as path with empty base.
    return { baseURL: '', path: endpoint };
  }
}

function deriveXmlPrefix(nsUri: string): string {
  const path = nsUri.replace(/^https?:\/\//, '');
  const segments = path.split(/[/-]/).filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (/^v\d/.test(seg)) continue;
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(seg)) continue;
    if (seg.length <= 1) continue;
    const candidate = seg.toLowerCase().substring(0, 20);
    if (RESERVED_XML_PREFIXES.has(candidate)) continue;
    return candidate;
  }
  return 'body';
}

function getOrAssignPrefix(
  nsUri: string,
  assigned: Map<string, string>,
  preferred?: string,
): string {
  const existing = assigned.get(nsUri);
  if (existing) return existing;
  const taken = new Set(assigned.values());
  let prefix = preferred && !taken.has(preferred) ? preferred : deriveXmlPrefix(nsUri);
  let i = 2;
  while (taken.has(prefix) || RESERVED_XML_PREFIXES.has(prefix)) {
    prefix = `${deriveXmlPrefix(nsUri)}${i++}`;
  }
  assigned.set(nsUri, prefix);
  return prefix;
}

function quoteKey(key: string): string {
  return `"${key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function literalExpr(value: unknown): string {
  return `$(${JSON.stringify(value)})`;
}

/** `{context.USER_NAME}` / `{env.FOO}` -> `$context.USER_NAME` / `$env.FOO` for Connectors. */
function meshInterpolatorToConnectExpr(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^\{(context|env|args|this)\.([^}]+)\}$/);
  if (!match) return null;
  return `$${match[1]}.${match[2]}`;
}

/**
 * Compact JSONSelection object (spaces, no newlines).
 * Newlines are optional sugar for Connectors; printing them as `\n` in SDL is noise
 * (same stance as OpenAPI connectAnnotations).
 */
function formatStaticXmlTree(value: unknown): string {
  const interpolated = meshInterpolatorToConnectExpr(value);
  if (interpolated) {
    return interpolated;
  }
  if (value == null || typeof value !== 'object') {
    return literalExpr(value);
  }
  if (Array.isArray(value)) {
    // Static soapHeaders may list repeated element values; emit every item.
    if (!value.length) {
      return literalExpr(null);
    }
    return `[ ${value.map(item => formatStaticXmlTree(item)).join(', ')} ]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return '{}';
  }
  const fields = entries.map(([k, v]) => {
    const key = /[:\s"]/.test(k) ? quoteKey(k) : k;
    return `${key}: ${formatStaticXmlTree(v)}`;
  });
  return `{ ${fields.join(' ')} }`;
}

export interface SoapConnectEmitInput {
  sourceName: string;
  endpoint: string;
  soapNamespace: string;
  soapAction?: string;
  elementName: string;
  bindingNamespace?: string;
  bodyAlias?: string;
  argNamespaces?: Record<string, string>;
  headerArgNames?: string[];
  soapHeaders?: SOAPHeaders;
  /** GraphQL arg names on the field (order preserved). */
  argNames: string[];
}

/**
 * Build `@connect` http.body JSONSelection: full FXP `"soap:Envelope"` tree.
 * Prefixed element keys are quoted so JSONSelection treats colons as part of the name.
 * Emitted compact (spaces, no newlines) so printed SDL does not fill with `\n` escapes.
 *
 * Prefix assignment mirrors the old soap executor:
 * - Pre-seed binding NS as `body` / `bodyAlias` so single-NS WSDLs keep the `body:` wire prefix.
 * - Pre-seed soapHeaders alias so it is not stolen by deriveXmlPrefix.
 * - Only emit `xmlns:*` for prefixes that appear on Header/Body elements (lazy).
 *
 * soapHeaders vs WSDL header args: config is seeded first; colliding GraphQL args are
 * spread over the static defaults (`...$args.X`) so present args win and omitted args
 * leave the defaults (spread of null/undefined is a no-op in applySelection).
 */
/** Flatten a `{ ... }` static tree into field entries (no outer braces). */
function staticTreeInnerFields(value: unknown): string[] {
  const nested = formatStaticXmlTree(value);
  if (!(nested.startsWith('{') && nested.endsWith('}'))) {
    return [nested];
  }
  const inner = nested.slice(1, -1).trim();
  return inner ? [inner] : [];
}

/**
 * soapHeaders default object with optional GraphQL arg overlay.
 * Spread of null/undefined `$args.X` is a no-op in applySelection, matching
 * "only overwrite when arg carries a real value".
 */
function formatHeaderWithOptionalArg(
  elementKey: string,
  staticValue: unknown,
  argName: string,
): string {
  const parts = [...staticTreeInnerFields(staticValue), `...$args.${argName}`];
  return `${quoteKey(elementKey)}: { ${parts.join(' ')} }`;
}

export function buildSoapConnectBody(input: SoapConnectEmitInput): string {
  const assigned = new Map<string, string>();
  const preferredBody =
    input.bodyAlias && !RESERVED_XML_PREFIXES.has(input.bodyAlias) ? input.bodyAlias : 'body';
  // Reserve preferred body prefix without implying an xmlns until an element uses it.
  if (input.bindingNamespace) {
    assigned.set(input.bindingNamespace, preferredBody);
  }
  if (input.soapHeaders?.headers && input.soapHeaders.namespace) {
    const rawAlias = input.soapHeaders.alias ?? 'header';
    const userAlias = RESERVED_XML_PREFIXES.has(rawAlias) ? 'header' : rawAlias;
    const nsUri = input.soapHeaders.namespace;
    const taken = new Set(assigned.values());
    if (!assigned.has(nsUri) && !taken.has(userAlias) && !RESERVED_XML_PREFIXES.has(userAlias)) {
      assigned.set(nsUri, userAlias);
    }
  }

  const headerArgSet = new Set(input.headerArgNames ?? []);
  const bodyFields: string[] = [];
  const headerFields: string[] = [];
  const usedPrefixes = new Set<string>();
  const markPrefix = (prefix: string | null) => {
    if (prefix) usedPrefixes.add(prefix);
  };

  const soapHeaderEntries =
    input.soapHeaders?.headers && typeof input.soapHeaders.headers === 'object'
      ? Object.entries(input.soapHeaders.headers as Record<string, unknown>)
      : [];
  const soapHeaderKeys = new Set(soapHeaderEntries.map(([k]) => k));

  if (soapHeaderEntries.length) {
    const hdrNs = input.soapHeaders!.namespace;
    const rawHdrAlias = input.soapHeaders!.alias ?? 'header';
    const preferredHdrAlias = RESERVED_XML_PREFIXES.has(rawHdrAlias) ? 'header' : rawHdrAlias;
    const hdrAlias = hdrNs
      ? getOrAssignPrefix(hdrNs, assigned, preferredHdrAlias)
      : preferredHdrAlias;
    markPrefix(hdrAlias);
    for (const [k, v] of soapHeaderEntries) {
      const elementKey = `${hdrAlias}:${k}`;
      if (headerArgSet.has(k) && input.argNames.includes(k)) {
        headerFields.push(formatHeaderWithOptionalArg(elementKey, v, k));
      } else {
        headerFields.push(`${quoteKey(elementKey)}: ${formatStaticXmlTree(v)}`);
      }
    }
  }

  for (const argName of input.argNames) {
    const nsUri = input.argNamespaces?.[argName] || input.bindingNamespace;
    const preferred =
      nsUri && (nsUri === input.bindingNamespace || assigned.get(nsUri) === preferredBody)
        ? preferredBody
        : undefined;
    const prefix = nsUri ? getOrAssignPrefix(nsUri, assigned, preferred) : null;
    markPrefix(prefix);
    const elementKey = prefix ? `${prefix}:${argName}` : argName;

    if (headerArgSet.has(argName)) {
      // Already emitted as static + spread when soapHeaders collides on the same key.
      if (soapHeaderKeys.has(argName)) {
        continue;
      }
      headerFields.push(`${quoteKey(elementKey)}: $args.${argName}`);
    } else {
      bodyFields.push(`${quoteKey(elementKey)}: $args.${argName}`);
    }
  }

  const xmlnsFields = [`${quoteKey('xmlns:soap')}: ${literalExpr(input.soapNamespace)}`];
  for (const [nsUri, prefix] of assigned) {
    if (!usedPrefixes.has(prefix)) continue;
    xmlnsFields.push(`${quoteKey(`xmlns:${prefix}`)}: ${literalExpr(nsUri)}`);
  }

  const envelopeChildren: string[] = [`attributes: { ${xmlnsFields.join(' ')} }`];
  if (headerFields.length) {
    envelopeChildren.push(`${quoteKey('soap:Header')}: { ${headerFields.join(' ')} }`);
  }
  envelopeChildren.push(
    `${quoteKey('soap:Body')}: {${bodyFields.length ? ` ${bodyFields.join(' ')} ` : ' '}}`,
  );

  return `${quoteKey('soap:Envelope')}: { ${envelopeChildren.join(' ')} }`;
}

/** Response selection: GraphQL return type is the SOAP response element (same as legacy executor). */
export function buildSoapConnectSelection(elementName: string): string {
  return `$.Envelope.Body.${elementName}`;
}

export function buildSoapConnectDirectiveArgs(input: SoapConnectEmitInput): {
  source: string;
  http: Record<string, unknown>;
  selection: string;
} {
  const { path } = splitSoapEndpoint(input.endpoint);
  const headers: Array<{ name: string; value: string }> = [];
  if (input.soapAction) {
    headers.push({ name: 'SOAPAction', value: input.soapAction });
  }
  return {
    source: input.sourceName,
    http: {
      POST: path,
      ...(headers.length ? { headers } : {}),
      body: buildSoapConnectBody(input),
    },
    selection: buildSoapConnectSelection(input.elementName),
  };
}

export function buildSoapSourceDirectiveArgs(opts: {
  name: string;
  endpoint: string;
  operationHeaders?: Record<string, string>;
}): { name: string; http: Record<string, unknown> } {
  const { baseURL } = splitSoapEndpoint(opts.endpoint);
  const headerMap: Record<string, string> = {
    'Content-Type': 'text/xml; charset=utf-8',
    ...(opts.operationHeaders || {}),
  };
  const headers = Object.entries(headerMap).map(([name, value]) => ({ name, value }));
  return {
    name: opts.name,
    http: {
      baseURL: baseURL || opts.endpoint || '',
      headers,
    },
  };
}
