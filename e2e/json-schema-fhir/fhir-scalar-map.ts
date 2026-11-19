import { GraphQLID, GraphQLString, type GraphQLScalarType } from 'graphql';
import { GraphQLDate, GraphQLDateTime, GraphQLURL, GraphQLUUID } from 'graphql-scalars';

/**
 * Locked FHIR primitive → scalar map (force-apply for cleaner SG).
 * Targets: https://the-guild.dev/graphql/scalars (Date / DateTime / URL / UUID)
 * plus GraphQL String / ID.
 *
 * Not mapped (stay FHIR `@regexp`): `code` / `markdown` / `base64Binary` / `xhtml`.
 *
 * Pattern mismatches (known; force-mapped anyway per Arda — no strictness for now):
 * - date→Date: FHIR allows YYYY / YYYY-MM; Date requires YYYY-MM-DD
 * - dateTime→DateTime: FHIR allows date-only; DateTime needs full offset datetime
 * - uri|url|canonical→URL: FHIR `\S*` allows relative refs; URL needs absolute
 * - uuid→UUID: FHIR is `urn:uuid:…`; UUID wants bare UUID
 * - oid→ID: FHIR is `urn:oid:…`; ID accepts any string (no format check)
 *
 * Compatible without force: string→String, id→ID, instant→DateTime.
 */
export function buildFhirScalarMap(): Record<string, GraphQLScalarType> {
  return {
    date: GraphQLDate,
    dateTime: GraphQLDateTime,
    instant: GraphQLDateTime,
    uri: GraphQLURL,
    url: GraphQLURL,
    canonical: GraphQLURL,
    uuid: GraphQLUUID,
    string: GraphQLString,
    id: GraphQLID,
    oid: GraphQLID,
  };
}
