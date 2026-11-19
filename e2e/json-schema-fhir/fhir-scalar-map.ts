import { GraphQLID, GraphQLString, type GraphQLScalarType } from 'graphql';
import { GraphQLDate, GraphQLDateTime, GraphQLURL, GraphQLUUID } from 'graphql-scalars';

/**
 * Locked FHIR primitive → scalar candidates
 * (https://the-guild.dev/graphql/scalars — Date / DateTime / URL / UUID + String / ID).
 * `code` / `markdown` / `oid` / `base64Binary` / `xhtml` stay as FHIR `@regexp` scalars.
 */
const fhirScalarCandidates: Record<string, GraphQLScalarType> = {
  date: GraphQLDate,
  dateTime: GraphQLDateTime,
  instant: GraphQLDateTime,
  uri: GraphQLURL,
  url: GraphQLURL,
  canonical: GraphQLURL,
  uuid: GraphQLUUID,
  string: GraphQLString,
  id: GraphQLID,
};

/**
 * Representative FHIR-legal samples that match each primitive's JSON Schema `pattern`.
 * A candidate is kept only when every sample serializes on the target scalar.
 */
const fhirPrimitiveSamples: Record<string, readonly string[]> = {
  // FHIR date allows YYYY / YYYY-MM / YYYY-MM-DD — Date rejects partial forms.
  date: ['2020', '2020-01', '2020-01-15'],
  // FHIR dateTime allows date-only forms — DateTime rejects those.
  dateTime: ['2020', '2020-01-15', '2020-01-15T12:00:00Z'],
  instant: ['2020-01-15T12:00:00Z', '2020-01-15T12:00:00.123+01:00'],
  // FHIR uri/url patterns are `^\S*$` (relative refs legal) — URL needs absolute.
  uri: ['Patient/123', 'http://example.com/Patient/1'],
  url: ['Patient/123', 'http://example.com'],
  canonical: [
    'http://hl7.org/fhir/StructureDefinition/Patient',
    'StructureDefinition/Patient',
  ],
  // FHIR uuid is `urn:uuid:…` — graphql-scalars UUID wants bare UUID.
  uuid: ['urn:uuid:550e8400-e29b-41d4-a716-446655440000'],
  string: ['hello', ' a '],
  id: ['abc', 'Patient.1'],
};

/**
 * Skips documented below are intentional — do not blindly rename; keep `@regexp`.
 *
 * - date→Date: FHIR allows YYYY / YYYY-MM; Date requires YYYY-MM-DD
 * - dateTime→DateTime: FHIR allows date-only; DateTime requires full offset datetime
 * - uri|url|canonical→URL: FHIR allows relative / non-URL `\S*`; URL requires absolute URL
 * - uuid→UUID: FHIR values are `urn:uuid:…`; UUID rejects the urn prefix
 *
 * Applied after check: string→String, id→ID, instant→DateTime.
 */
export function buildFhirScalarMap(): Record<string, GraphQLScalarType> {
  const applied: Record<string, GraphQLScalarType> = {};
  for (const [title, scalar] of Object.entries(fhirScalarCandidates)) {
    const samples = fhirPrimitiveSamples[title] ?? [];
    const incompatible = samples.find(sample => {
      try {
        scalar.serialize(sample);
        return false;
      } catch {
        return true;
      }
    });
    if (incompatible != null) {
      continue;
    }
    applied[title] = scalar;
  }
  return applied;
}
