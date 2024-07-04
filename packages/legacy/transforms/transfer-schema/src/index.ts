import type { GraphQLArgumentConfig, GraphQLFieldConfig, GraphQLSchema } from 'graphql';
import { GraphQLObjectType } from 'graphql';
import micromatch from 'micromatch';
import type { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { MapperKind, mapSchema, pruneSchema } from '@graphql-tools/utils';

export default class TransferSchemaTransform implements MeshTransform {
  noWrap = true;
  private additionalFieldsMap: Map<string, Set<string>>;
  private additionalArgsMap: Map<string, Set<string>>;
  private additionalFieldsConfig: Map<string, { [key: string]: GraphQLFieldConfig<any, any> }>;
  private additionalArgsConfig: Map<string, { [key: string]: GraphQLArgumentConfig }>;
  private removalFieldsMap: Map<string, Set<string>>;
  private removalArgsMap: Map<string, Set<string>>;

  constructor(options: MeshTransformOptions<YamlConfig.TransferSchemaTransformConfig>) {
    const { config } = options;
    this.additionalFieldsMap = new Map();
    this.additionalArgsMap = new Map();
    this.additionalFieldsConfig = new Map();
    this.additionalArgsConfig = new Map();
    this.removalFieldsMap = new Map();
    this.removalArgsMap = new Map();

    for (const transfer of config.transfers) {
      const [fromType, fromFieldNameOrGlob, fromArgsGlob] = transfer.from.split('.');

      const rawGlob = fromArgsGlob || fromFieldNameOrGlob;
      const fixedGlob =
        rawGlob.includes('{') && !rawGlob.includes(',')
          ? rawGlob.replace('{', '').replace('}', '')
          : rawGlob;
      const polishedGlob = fixedGlob.split(', ').join(',').trim();

      const mapName = fromArgsGlob ? 'ArgsMap' : 'FieldsMap';
      const mapKey = fromArgsGlob ? `${fromType}.${fromFieldNameOrGlob}` : fromType;

      if (transfer.action === 'move') {
        const currentRemovalRules = this[`removal${mapName}`].get(mapKey) || new Set();
        currentRemovalRules.add(polishedGlob);
        this[`removal${mapName}`].set(mapKey, currentRemovalRules);
      }

      const currentAdditionalRules = this[`additional${mapName}`].get(mapKey) || new Set();
      currentAdditionalRules.add(`${transfer.to}.${polishedGlob}`);
      this[`additional${mapName}`].set(mapKey, currentAdditionalRules);
    }
  }

  handleAdditions(rulesArray: Set<string>, value: string, config: any): void {
    for (const rule of rulesArray) {
      const [toType, toField, pattern] = rule.split('.');
      const usePattern = pattern || toField;
      const mapIdentifier = pattern ? 'ArgsConfig' : 'FieldsConfig';
      const mapKey = pattern ? `${toType}.${toField}` : toType;

      const isMatch = micromatch.matcher(usePattern);
      if (isMatch(value)) {
        const currentAdditionalConfigs = this[`additional${mapIdentifier}`].get(mapKey) || {};
        this[`additional${mapIdentifier}`].set(mapKey, {
          ...currentAdditionalConfigs,
          [value]: config,
        });
        break;
      }
    }
  }

  matchInSet(rulesSet: Set<string>, value: string): true | undefined {
    for (const rule of rulesSet) {
      const isMatch = micromatch.matcher(rule);
      if (isMatch(value)) return true;
    }
    return undefined;
  }

  transformSchema(schema: GraphQLSchema) {
    // initial mapSchema is necessary to store fields/args configs that will be attached to Types/fields in second map
    const schemaWithRemovals = mapSchema(schema, {
      [MapperKind.COMPOSITE_FIELD]: (fieldConfig, fieldName, typeName) => {
        const additionalFieldRules = this.additionalFieldsMap.get(typeName);
        const additionalArgRules = this.additionalArgsMap.get(`${typeName}.${fieldName}`);
        const removalFieldRules = this.removalFieldsMap.get(typeName);
        const removalArgRules = this.removalArgsMap.get(`${typeName}.${fieldName}`);
        const hasAdditionalFieldRules = Boolean(additionalFieldRules);
        const hasAdditionalArgRules = Boolean(additionalArgRules);
        const hasRemovalFieldRules = Boolean(removalFieldRules && removalFieldRules.size);
        const hasRemovalArgRules = Boolean(removalArgRules && removalArgRules.size);

        // handle field addition
        if (hasAdditionalFieldRules) {
          this.handleAdditions(additionalFieldRules, fieldName, fieldConfig);
        }

        // handle args addition
        if (hasAdditionalArgRules) {
          for (const [argName, argConfig] of Object.entries(fieldConfig.args)) {
            this.handleAdditions(additionalArgRules, argName, argConfig);
          }
        }

        // handle field removal
        if (hasRemovalFieldRules && this.matchInSet(removalFieldRules, fieldName)) return null;

        // handle args removal
        if (hasRemovalArgRules) {
          const newArgs = Object.entries(fieldConfig.args).reduce((args, [argName, argConfig]) => {
            return this.matchInSet(removalArgRules, argName)
              ? args
              : { ...args, [argName]: argConfig };
          }, {});

          return { ...fieldConfig, args: newArgs };
        }

        return undefined;
      },
    });

    const schemaWithAdditions = mapSchema(schemaWithRemovals, {
      ...(this.additionalFieldsConfig.size && {
        [MapperKind.OBJECT_TYPE]: type => {
          const additionalFieldsConfigMap = this.additionalFieldsConfig.get(type.toString());

          if (!additionalFieldsConfigMap) return undefined;

          const newConfig = { ...type.toConfig() };
          newConfig.fields = { ...newConfig.fields, ...additionalFieldsConfigMap };

          return new GraphQLObjectType(newConfig);
        },
      }),
      ...(this.additionalArgsConfig.size && {
        [MapperKind.COMPOSITE_FIELD]: (fieldConfig, fieldName, typeName) => {
          const additionalArgsConfigMap = this.additionalArgsConfig.get(`${typeName}.${fieldName}`);

          if (!additionalArgsConfigMap) return undefined;

          return {
            ...fieldConfig,
            args: { ...(fieldConfig.args || {}), ...additionalArgsConfigMap },
          };
        },
      }),
    });

    return pruneSchema(schemaWithAdditions);
  }
}
