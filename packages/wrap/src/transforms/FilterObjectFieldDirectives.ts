import { getArgumentValues, type GraphQLFieldConfig, type GraphQLSchema } from 'graphql';
import { type SubschemaConfig, type Transform } from '@graphql-tools/delegate';
import TransformObjectFields from './TransformObjectFields.js';

interface FilterObjectFieldDirectivesTransformationContext extends Record<string, any> {}

export default class FilterObjectFieldDirectives<
  TContext = Record<string, any>,
> implements Transform<FilterObjectFieldDirectivesTransformationContext, TContext> {
  private readonly filter: (dirName: string, dirValue: any) => boolean;

  constructor(filter: (dirName: string, dirValue: any) => boolean) {
    this.filter = filter;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  ): GraphQLSchema {
    const transformer = new TransformObjectFields(
      (_typeName: string, _fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        let changed = false;
        let nextConfig = fieldConfig;

        const astDirectives = fieldConfig.astNode?.directives;
        if (astDirectives != null) {
          const keepDirectives = astDirectives.filter(dir => {
            const directiveDef = originalWrappingSchema.getDirective(dir.name.value);
            const directiveValue = directiveDef ? getArgumentValues(directiveDef, dir) : undefined;
            return this.filter(dir.name.value, directiveValue);
          });

          if (keepDirectives.length !== astDirectives.length) {
            changed = true;
            nextConfig = {
              ...nextConfig,
              astNode: {
                ...nextConfig.astNode!,
                directives: keepDirectives,
              },
            };
          }
        }

        const extensionDirectives = (
          fieldConfig.extensions as { directives?: Record<string, any> } | undefined
        )?.directives;
        if (extensionDirectives != null && typeof extensionDirectives === 'object') {
          const keptExtensions: Record<string, any> = Object.create(null);
          let removed = false;
          for (const dirName of Object.keys(extensionDirectives)) {
            if (!Object.prototype.hasOwnProperty.call(extensionDirectives, dirName)) {
              continue;
            }
            const dirValue = extensionDirectives[dirName];
            // extensions.directives may hold a single value or an array of instances
            if (Array.isArray(dirValue)) {
              const kept = dirValue.filter(instance => this.filter(dirName, instance));
              if (kept.length !== dirValue.length) {
                removed = true;
              }
              if (kept.length > 0) {
                keptExtensions[dirName] = kept;
              } else {
                removed = true;
              }
            } else if (this.filter(dirName, dirValue)) {
              keptExtensions[dirName] = dirValue;
            } else {
              removed = true;
            }
          }
          if (removed) {
            changed = true;
            nextConfig = {
              ...nextConfig,
              extensions: {
                ...nextConfig.extensions,
                directives: keptExtensions,
              },
            };
          }
        }

        return changed ? nextConfig : undefined;
      },
    );

    return transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }
}
