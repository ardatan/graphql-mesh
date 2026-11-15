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
 * Attributed leaves keep `{ attributes, innerText }` through selection so mappings like
 * `code: Item.attributes.code` work; `unwrapXmlScalarLeaf` runs when a GraphQL scalar
 * field needs the text (or null for attributes-only / `xsi:nil`).
 *
 * `numberParseOptions.leadingZeros: false` keeps leading-zero identifiers as strings
 * (`00123`) while still coercing plain numbers and booleans.
 */
export const connectXmlOptions = {
  attributeNamePrefix: '',
  attributesGroupName: 'attributes',
  textNodeName: 'innerText',
  ignoreAttributes: false,
  removeNSPrefix: true,
  allowBooleanAttributes: true,
  numberParseOptions: {
    // FXP: false => do not parse values that start with 0 as numbers.
    leadingZeros: false,
  },
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
 *
 * Exception: an unprefixed child that declares `attributes.xmlns` (default namespace)
 * stays unprefixed — forcing the parent prefix would ignore the child's xmlns.
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
    const childAttrs =
      child != null && typeof child === 'object' && !Array.isArray(child)
        ? (child as Record<string, unknown>).attributes
        : undefined;
    const hasDefaultXmlns =
      childAttrs != null &&
      typeof childAttrs === 'object' &&
      !Array.isArray(childAttrs) &&
      Object.prototype.hasOwnProperty.call(childAttrs, 'xmlns');
    const prefix = prefixed ? prefixed[1] : hasDefaultXmlns ? undefined : inheritPrefix;
    const localName = prefixed ? prefixed[2] : key;
    const outKey = prefix ? `${prefix}:${localName}` : localName;
    // Default xmlns subtree: stop inheriting the outer prefix into descendants.
    const childInherit = hasDefaultXmlns ? undefined : (prefix ?? inheritPrefix);
    out[outKey] = inheritXmlNamespacePrefixes(child, childInherit);
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
 * Collapse singleton arrays. Keep attributed / mixed nodes intact for selection.
 * Pure `{ innerText }` leaves (no attributes/children) unwrap for convenience.
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
    const keys = Object.keys(obj);
    if (keys.length === 1 && keys[0] === 'innerText') {
      return obj.innerText;
    }
    for (const key of keys) {
      obj[key] = normalizeXmlResult(obj[key]);
    }
  }
  return result;
}

/**
 * When a GraphQL scalar/enum field needs a value from an XML node:
 * - `{ innerText, attributes? }` (no other children) -> text
 * - `{ attributes }` only (e.g. xsi:nil) -> null
 * - otherwise leave the object for structured fields
 */
export function unwrapXmlScalarLeaf(value: unknown): unknown {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 1 && keys[0] === 'attributes') {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(obj, 'innerText')) {
    const nonAttrKeys = keys.filter(k => k !== 'attributes');
    if (nonAttrKeys.length === 1 && nonAttrKeys[0] === 'innerText') {
      return obj.innerText;
    }
  }
  return value;
}

/** @deprecated kept for unit tests that import the old name */
export function collapseSingletonXmlArrays(value: unknown): unknown {
  return normalizeXmlResult(value);
}
