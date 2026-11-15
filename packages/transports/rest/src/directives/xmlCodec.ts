import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { getNamedType, isInputObjectType, type GraphQLField, type GraphQLType } from 'graphql';

/**
 * Shared fast-xml-parser options for Mesh `@connect` XML bodies/responses.
 *
 * Authors write JSONSelection → this object shape; Mesh does JSON↔XML only
 * (no SOAP Envelope sugar). Keys with colons (e.g. `soap:Envelope`) must use
 * quoted JSONSelection aliases: `"soap:Envelope": { ... }`.
 *
 * Response parse uses `removeNSPrefix: true` so selection paths stay unprefixed
 * (`Envelope.Body...`). Request keys may still be prefixed for correct xmlns emission.
 *
 * Unlike legacy `transport-soap`, elements are not forced into arrays — better
 * for Connectors `selection` paths. Repeated sibling elements still become arrays.
 * Singleton arrays are collapsed and `innerText` is unwrapped (legacy normalizeResult).
 */
export const connectXmlOptions = {
  attributeNamePrefix: '',
  attributesGroupName: 'attributes',
  textNodeName: 'innerText',
  ignoreAttributes: false,
  removeNSPrefix: true,
  allowBooleanAttributes: true,
} as const;

const xmlBuilder = new XMLBuilder({
  ...connectXmlOptions,
  // Ignore undeclared attributes group when building from selection objects.
  suppressBooleanAttributes: false,
});

const xmlParser = new XMLParser({
  ...connectXmlOptions,
});

/** True for `text/xml`, `application/xml`, `application/soap+xml`, `+xml` suffixes. */
export function isXmlContentType(contentType: string | undefined | null): boolean {
  if (!contentType) return false;
  const ct = contentType.toLowerCase().split(';')[0]!.trim();
  return (
    ct === 'text/xml' ||
    ct === 'application/xml' ||
    ct === 'application/soap+xml' ||
    ct.endsWith('+xml') ||
    ct.includes('xml')
  );
}

/**
 * Strict sniff for XML when Content-Type is missing. Only `<?xml ...` - do not
 * match bare `<...>` (HTML 404 pages would otherwise be treated as successful XML).
 */
export function looksLikeXml(text: string): boolean {
  return text.trimStart().startsWith('<?xml');
}

/**
 * When a parent element is `"orders:SubmitOrder": $args.SubmitOrder`, GraphQL args
 * are unprefixed objects. Inherit the parent's namespace prefix onto descendant
 * keys (except `attributes` / `innerText`) so SOAP/XML codecs match WSDL-qualified trees.
 */
export function inheritXmlNamespacePrefixes(value: unknown, inheritPrefix?: string): unknown {
  if (Array.isArray(value)) {
    return value.map(item => inheritXmlNamespacePrefixes(item, inheritPrefix));
  }
  if (value == null || typeof value !== 'object') {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'attributes' || key === 'innerText') {
      out[key] = child;
      continue;
    }
    const prefixed = key.match(/^([^:]+):(.+)$/);
    const prefix = prefixed ? prefixed[1] : inheritPrefix;
    const localName = prefixed ? prefixed[2] : key;
    const outKey = prefix ? `${prefix}:${localName}` : localName;
    out[outKey] = inheritXmlNamespacePrefixes(child, prefix ?? inheritPrefix);
  }
  return out;
}

export interface XmlBuildOptions {
  /**
   * GraphQL field whose args produced the envelope body/header trees.
   * When set with `typeNamespaces`, nested keys use each input type's XSD
   * namespace (legacy transport-soap `buildValueXml`), not only the parent prefix.
   */
  field?: GraphQLField<any, any>;
  /** GraphQL input type name → XSD namespace URI (from SOAPLoader typeNamespacesJson). */
  typeNamespaces?: Record<string, string> | Map<string, string>;
}

function asTypeNamespaceMap(
  typeNamespaces?: Record<string, string> | Map<string, string>,
): Map<string, string> | undefined {
  if (!typeNamespaces) return undefined;
  return typeNamespaces instanceof Map ? typeNamespaces : new Map(Object.entries(typeNamespaces));
}

/**
 * Recursively qualify object keys with XSD namespace prefixes from GraphQL input types.
 * Mirrors legacy transport-soap `buildValueXml` (without string interpolation — args are
 * already resolved GraphQL values).
 */
function buildValueXml(
  value: unknown,
  graphqlType: GraphQLType | undefined,
  typeNamespaceMap: Map<string, string>,
  assigned: Map<string, string>,
  envelopeAttrs: Record<string, string>,
  fallbackPrefix?: string,
): unknown {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map(item =>
      buildValueXml(item, graphqlType, typeNamespaceMap, assigned, envelopeAttrs, fallbackPrefix),
    );
  }

  if (typeof value === 'object') {
    const namedType = graphqlType ? getNamedType(graphqlType) : null;
    const typeNsUri = namedType ? typeNamespaceMap.get(namedType.name) : null;
    const resolvedPrefix = typeNsUri ? getOrAssignPrefix(typeNsUri, assigned, envelopeAttrs) : null;
    const nsPrefix = resolvedPrefix ?? fallbackPrefix ?? null;

    const result: Record<string, unknown> = {};
    if (namedType && isInputObjectType(namedType)) {
      const fields = namedType.getFields();
      for (const key of Object.keys(value as object)) {
        if (key === 'attributes') {
          result[key] = (value as any)[key];
          continue;
        }
        if (key === 'innerText') {
          result[key] = (value as any)[key];
          continue;
        }
        const local = localNameOf(key);
        const fieldType = fields[local]?.type;
        const xmlKey = nsPrefix ? `${nsPrefix}:${local}` : local;
        result[xmlKey] = buildValueXml(
          (value as any)[key],
          fieldType,
          typeNamespaceMap,
          assigned,
          envelopeAttrs,
          nsPrefix ?? undefined,
        );
      }
    } else {
      for (const key of Object.keys(value as object)) {
        if (key === 'attributes' || key === 'innerText') {
          result[key] = (value as any)[key];
          continue;
        }
        // Strip any prior prefix; re-qualify with the current namespace.
        const local = localNameOf(key);
        const xmlKey = nsPrefix ? `${nsPrefix}:${local}` : local;
        result[xmlKey] = buildValueXml(
          (value as any)[key],
          undefined,
          typeNamespaceMap,
          assigned,
          envelopeAttrs,
          nsPrefix ?? undefined,
        );
      }
    }
    return result;
  }

  // Scalars: FXP emits primitive text nodes the same as `{ innerText: String(value) }`.
  return value;
}

function getOrAssignPrefix(
  nsUri: string,
  assigned: Map<string, string>,
  envelopeAttrs: Record<string, string>,
): string {
  const existing = assigned.get(nsUri);
  if (existing) {
    if (envelopeAttrs[`xmlns:${existing}`] === undefined) {
      envelopeAttrs[`xmlns:${existing}`] = nsUri;
    }
    return existing;
  }
  const base = deriveXmlPrefix(nsUri);
  let prefix = base;
  let i = 2;
  const taken = new Set(assigned.values());
  while (envelopeAttrs[`xmlns:${prefix}`] !== undefined || taken.has(prefix)) {
    prefix = `${base}${i++}`;
  }
  assigned.set(nsUri, prefix);
  envelopeAttrs[`xmlns:${prefix}`] = nsUri;
  return prefix;
}

const RESERVED_XML_PREFIXES = new Set(['xml', 'xmlns']);

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

function localNameOf(key: string | number): string {
  const s = String(key);
  const i = s.indexOf(':');
  return i === -1 ? s : s.slice(i + 1);
}

function prefixOf(key: string | number): string | undefined {
  const s = String(key);
  const i = s.indexOf(':');
  return i === -1 ? undefined : s.slice(0, i);
}

/**
 * Re-qualify `soap:Header` / `soap:Body` arg trees using GraphQL input types +
 * typeNamespaces (legacy transport-soap). Falls back to parent-prefix inheritance.
 */
export function prepareXmlJsObjectForBuild(value: unknown, opts?: XmlBuildOptions): unknown {
  const typeNamespaceMap = asTypeNamespaceMap(opts?.typeNamespaces);
  const field = opts?.field;
  if (!typeNamespaceMap?.size || !field?.args?.length) {
    return inheritXmlNamespacePrefixes(value);
  }

  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return inheritXmlNamespacePrefixes(value);
  }

  const root = value as Record<string, unknown>;
  // Envelope may be keyed `soap:Envelope` or already processed.
  const envelopeKey = Object.keys(root).find(k => localNameOf(k) === 'Envelope');
  if (!envelopeKey) {
    return inheritXmlNamespacePrefixes(value);
  }

  const envelope = root[envelopeKey];
  if (envelope == null || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return inheritXmlNamespacePrefixes(value);
  }

  const envObj = { ...(envelope as Record<string, unknown>) };
  const attrsRaw = envObj.attributes;
  const envelopeAttrs: Record<string, string> =
    attrsRaw && typeof attrsRaw === 'object' && !Array.isArray(attrsRaw)
      ? { ...(attrsRaw as Record<string, string>) }
      : {};

  const assigned = new Map<string, string>();
  for (const [attrName, attrVal] of Object.entries(envelopeAttrs)) {
    if (attrName.startsWith('xmlns:') && typeof attrVal === 'string') {
      assigned.set(attrVal, attrName.slice('xmlns:'.length));
    }
  }

  const argTypeMap = Object.fromEntries(field.args.map(a => [a.name, a.type]));

  for (const sectionKey of Object.keys(envObj)) {
    if (sectionKey === 'attributes') continue;
    const sectionLocal = localNameOf(sectionKey);
    if (sectionLocal !== 'Header' && sectionLocal !== 'Body') continue;
    const sectionVal = envObj[sectionKey];
    if (sectionVal == null || typeof sectionVal !== 'object' || Array.isArray(sectionVal)) {
      continue;
    }
    const nextSection: Record<string, unknown> = {};
    for (const [elemKey, elemVal] of Object.entries(sectionVal as Record<string, unknown>)) {
      const argName = localNameOf(elemKey);
      const argPrefix = prefixOf(elemKey);
      const argType = argTypeMap[argName];
      if (!argType) {
        nextSection[elemKey] = inheritXmlNamespacePrefixes(elemVal, argPrefix);
        continue;
      }
      // Keep the emit-time element QName; re-qualify descendants by GraphQL type NS.
      nextSection[elemKey] = buildValueXml(
        elemVal,
        argType,
        typeNamespaceMap,
        assigned,
        envelopeAttrs,
        argPrefix,
      );
    }
    envObj[sectionKey] = nextSection;
  }

  envObj.attributes = envelopeAttrs;
  return { [envelopeKey]: envObj };
}

export function jsObjectToXml(value: unknown, opts?: XmlBuildOptions): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return xmlBuilder.build(prepareXmlJsObjectForBuild(value, opts));
}

export function xmlToJsObject(xml: string): unknown {
  const parsed = xmlParser.parse(xml);
  return normalizeXmlResult(parsed);
}

/**
 * Legacy transport-soap `normalizeResult`: unwrap `innerText` and length-1 arrays
 * so GraphQL default resolvers see scalars / objects (Connectors selection stays
 * object-shaped for singletons; nested list fields still need pluralization
 * resolvers — see processDirectives).
 */
function normalizeXmlResult(result: unknown): unknown {
  if (result != null && typeof result === 'object') {
    if (Array.isArray(result)) {
      if (result.length === 1) {
        return normalizeXmlResult(result[0]);
      }
      return result.map(normalizeXmlResult);
    }
    for (const key in result as object) {
      if (key === 'innerText') {
        return (result as any).innerText;
      }
      (result as any)[key] = normalizeXmlResult((result as any)[key]);
    }
  }
  return result;
}

/** @deprecated use normalizeXmlResult via xmlToJsObject — kept for unit tests */
export function collapseSingletonXmlArrays(value: unknown): unknown {
  return normalizeXmlResult(value);
}
