import { XMLBuilder, XMLParser } from 'fast-xml-parser';

/**
 * Shared fast-xml-parser options for Mesh `@connect` XML bodies/responses.
 *
 * Authors write JSONSelection to this object shape; Mesh does JSON/XML only
 * (no SOAP Envelope sugar). Keys with colons (e.g. `soap:Envelope`) must use
 * quoted JSONSelection aliases: `"soap:Envelope": { ... }`.
 *
 * Response parse uses `removeNSPrefix: true` so selection paths stay unprefixed
 * (`Envelope.Body...`). Request keys may still be prefixed for correct xmlns emission.
 *
 * Nested `$args` objects stay unprefixed in selection; `inheritXmlNamespacePrefixes`
 * copies the parent element's prefix onto descendants (typical WSDL elementFormDefault).
 * Singleton arrays are collapsed and `innerText` is unwrapped so GraphQL scalars
 * (e.g. Date) receive strings, not `{ innerText, attributes }` objects.
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
  return normalizeXmlResult(parsed);
}

/**
 * Legacy transport-soap `normalizeResult`: unwrap `innerText` and length-1 arrays.
 * Attributed leaves without text (e.g. `xsi:nil`) become `null` so Date/String
 * scalars do not receive `{ attributes }` objects.
 */
function normalizeXmlResult(result: unknown): unknown {
  if (result != null && typeof result === 'object') {
    if (Array.isArray(result)) {
      if (result.length === 1) {
        return normalizeXmlResult(result[0]);
      }
      return result.map(normalizeXmlResult);
    }
    const obj = result as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(obj, 'innerText')) {
      return obj.innerText;
    }
    const keys = Object.keys(obj);
    if (keys.length === 1 && keys[0] === 'attributes') {
      return null;
    }
    for (const key of keys) {
      obj[key] = normalizeXmlResult(obj[key]);
    }
  }
  return result;
}

/** @deprecated kept for unit tests that import the old name */
export function collapseSingletonXmlArrays(value: unknown): unknown {
  return normalizeXmlResult(value);
}
