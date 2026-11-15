import { XMLBuilder, XMLParser } from 'fast-xml-parser';

/**
 * Shared fast-xml-parser options for Mesh `@connect` XML bodies/responses.
 *
 * Authors write JSONSelection → this object shape; Mesh does JSON↔XML only
 * (no SOAP Envelope sugar). Keys with colons (e.g. `soap:Envelope`) must use
 * quoted JSONSelection aliases: `"soap:Envelope": { … }`.
 *
 * Response parse uses `removeNSPrefix: true` so selection paths stay unprefixed
 * (`Envelope.Body.…`). Request keys may still be prefixed for correct xmlns emission.
 *
 * Unlike legacy `transport-soap`, elements are not forced into arrays — better
 * for Connectors `selection` paths. Repeated sibling elements still become arrays.
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
 * Strict sniff for XML when Content-Type is missing. Only `<?xml …` — do **not**
 * match bare `<…>` (HTML 404 pages would otherwise be treated as successful XML).
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

export function jsObjectToXml(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return xmlBuilder.build(inheritXmlNamespacePrefixes(value));
}

export function xmlToJsObject(xml: string): unknown {
  const parsed = xmlParser.parse(xml);
  return collapseSingletonXmlArrays(parsed);
}

/**
 * Collapse length-1 arrays produced when FXP sees a single child element that
 * could also be repeated — keeps Connectors selection paths object-shaped.
 */
function collapseSingletonXmlArrays(value: unknown): unknown {
  if (Array.isArray(value)) {
    if (value.length === 1) {
      return collapseSingletonXmlArrays(value[0]);
    }
    return value.map(collapseSingletonXmlArrays);
  }
  if (value != null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = collapseSingletonXmlArrays(child);
    }
    return out;
  }
  return value;
}
