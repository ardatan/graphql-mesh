import { type GraphQLSchema } from 'graphql';
import {
  getDirectiveExtensions,
  MapperKind,
  mapSchema,
  type DirectableObject,
} from '@graphql-tools/utils';

const INACCESSIBLE_SPEC_PREFIX = 'https://specs.apollo.dev/inaccessible';

function resolveInaccessibleDirectiveName(schema: GraphQLSchema): string {
  const schemaDirs = getDirectiveExtensions<{
    link: { url?: string; import?: unknown };
  }>(schema, schema);
  const links = schemaDirs?.link;
  if (Array.isArray(links)) {
    for (const link of links) {
      if (typeof link?.url === 'string' && link.url.startsWith(INACCESSIBLE_SPEC_PREFIX)) {
        const imports = link.import;
        if (Array.isArray(imports)) {
          for (const item of imports) {
            if (typeof item === 'string') {
              const name = item.replace(/^@/, '');
              if (name === 'inaccessible') {
                return 'inaccessible';
              }
            } else if (item && typeof item === 'object') {
              const name = String((item as any).name ?? '').replace(/^@/, '');
              const as =
                (item as any).as != null ? String((item as any).as).replace(/^@/, '') : name;
              if (name === 'inaccessible') {
                return as || 'inaccessible';
              }
            }
          }
        }
        return 'inaccessible';
      }
    }
  }
  return 'inaccessible';
}

function hasInaccessible(obj: DirectableObject, inaccessibleName: string) {
  const dirs = getDirectiveExtensions(obj);
  return dirs?.[inaccessibleName]?.length;
}

/**
 * Strip federation join/link internals and `@inaccessible` from a stitched
 * schema. Federation calls this from stitch `onStitchedSchema` so root proxies
 * bind once to the public schema.
 */
export function filterInternalFieldsAndTypes(finalSchema: GraphQLSchema): GraphQLSchema {
  const inaccessibleName = resolveInaccessibleDirectiveName(finalSchema);
  const internalTypeNameRegexp =
    /^(?:_Entity|_Any|_FieldSet|_Service|link|inaccessible|(?:link__|join__|core__)[\w]*)$/;
  return mapSchema(finalSchema, {
    [MapperKind.DIRECTIVE]: directive => {
      if (internalTypeNameRegexp.test(directive.name)) {
        return null;
      }
      return directive;
    },
    [MapperKind.TYPE]: type => {
      if (internalTypeNameRegexp.test(type.name) || hasInaccessible(type, inaccessibleName)) {
        return null;
      }
      return type;
    },
    [MapperKind.FIELD]: fieldConfig => {
      if (hasInaccessible(fieldConfig, inaccessibleName)) {
        return null;
      }
      return fieldConfig;
    },
    [MapperKind.QUERY_ROOT_FIELD]: (fieldConfig, fieldName) => {
      if (fieldName === '_entities' || hasInaccessible(fieldConfig, inaccessibleName)) {
        return null;
      }
      return fieldConfig;
    },
    [MapperKind.ENUM_VALUE]: valueConfig => {
      if (hasInaccessible(valueConfig, inaccessibleName)) {
        return null;
      }
      return valueConfig;
    },
    [MapperKind.ARGUMENT]: argConfig => {
      if (hasInaccessible(argConfig, inaccessibleName)) {
        return null;
      }
      return argConfig;
    },
  });
}
