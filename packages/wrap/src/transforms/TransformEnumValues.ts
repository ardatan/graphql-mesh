import {
  valueFromASTUntyped,
  type ConstValueNode,
  type GraphQLEnumValueConfig,
  type GraphQLSchema,
} from 'graphql';
import {
  type DelegationContext,
  type SubschemaConfig,
  type Transform,
} from '@graphql-tools/delegate';
import {
  MapperKind,
  mapSchema,
  transformInputValue,
  type ExecutionRequest,
  type ExecutionResult,
  type Maybe,
} from '@graphql-tools/utils';
import { type EnumValueTransformer, type LeafValueTransformer } from '../types.js';
import MapLeafValues, { type MapLeafValuesTransformationContext } from './MapLeafValues.js';

interface TransformEnumValuesTransformationContext extends MapLeafValuesTransformationContext {}

export default class TransformEnumValues<TContext = Record<string, any>> implements Transform<
  TransformEnumValuesTransformationContext,
  TContext
> {
  private readonly enumValueTransformer: EnumValueTransformer;
  private readonly transformer: MapLeafValues<TContext>;
  private readonly hasLeafCallbacks: boolean;
  private transformedSchema: GraphQLSchema | undefined;
  private mapping: Record<string, Record<string, string>>;
  private reverseMapping: Record<string, Record<string, string>>;
  private noTransformation = true;

  constructor(
    enumValueTransformer: EnumValueTransformer,
    inputValueTransformer?: LeafValueTransformer,
    outputValueTransformer?: LeafValueTransformer,
  ) {
    this.enumValueTransformer = enumValueTransformer;
    this.mapping = Object.create(null);
    this.reverseMapping = Object.create(null);
    this.hasLeafCallbacks = inputValueTransformer != null || outputValueTransformer != null;
    this.transformer = new MapLeafValues(
      generateValueTransformer(inputValueTransformer, this.reverseMapping),
      generateValueTransformer(outputValueTransformer, this.mapping),
    );
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  ): GraphQLSchema {
    const mappingSchema = this.transformer.transformSchema(originalWrappingSchema, subschemaConfig);
    this.transformedSchema = mapSchema(mappingSchema, {
      [MapperKind.ENUM_VALUE]: (valueConfig, typeName, _schema, externalValue) =>
        this.transformEnumValue(typeName, externalValue, valueConfig),
      [MapperKind.ARGUMENT]: argConfig =>
        this.translateDefaultValue(
          argConfig as {
            type: any;
            defaultValue?: any;
            default?: { literal?: ConstValueNode };
          },
        ) as typeof argConfig | undefined,
      [MapperKind.INPUT_OBJECT_FIELD]: inputFieldConfig =>
        this.translateDefaultValue(
          inputFieldConfig as {
            type: any;
            defaultValue?: any;
            default?: { literal?: ConstValueNode };
          },
        ) as typeof inputFieldConfig | undefined,
    });
    // Leaf callbacks still need request/result traversal even without renames.
    if (this.hasLeafCallbacks) {
      this.noTransformation = false;
    }
    return this.transformedSchema;
  }

  private translateDefaultValue<
    TConfig extends {
      type: any;
      defaultValue?: any;
      default?: { literal?: ConstValueNode };
    },
  >(config: TConfig): TConfig | undefined {
    // graphql 17 keeps sdl defaults as a literal with the original enum names. map
    // them and use the internal default value instead because enum values in the
    // wrapping schema have no internal values and use their names
    const defaultLiteral = config.default?.literal;
    if (defaultLiteral != null) {
      let changed = false;
      const newValue = transformInputValue(
        config.type,
        valueFromASTUntyped(defaultLiteral),
        (type, value) => {
          const mapped = this.mapping[type.name]?.[value];
          if (mapped == null) {
            return value;
          }
          changed = true;
          return mapped;
        },
      );
      if (!changed) {
        return undefined;
      }
      return {
        ...config,
        default: undefined,
        defaultValue: newValue,
      };
    }
    if (config.defaultValue != null) {
      const newValue = transformInputValue(config.type, config.defaultValue, (type, value) => {
        return this.mapping[type.name]?.[value] ?? value;
      });
      return {
        ...config,
        defaultValue: newValue,
      };
    }
    return undefined;
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext<TContext>,
    transformationContext: TransformEnumValuesTransformationContext,
  ): ExecutionRequest {
    if (this.noTransformation) {
      return originalRequest;
    }
    return this.transformer.transformRequest(
      originalRequest,
      delegationContext,
      transformationContext,
    );
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext<TContext>,
    transformationContext: TransformEnumValuesTransformationContext,
  ) {
    if (this.noTransformation) {
      return originalResult;
    }
    return this.transformer.transformResult(
      originalResult,
      delegationContext,
      transformationContext,
    );
  }

  private transformEnumValue(
    typeName: string,
    externalValue: string,
    enumValueConfig: GraphQLEnumValueConfig,
  ): Maybe<GraphQLEnumValueConfig | [string, GraphQLEnumValueConfig]> {
    const transformedEnumValue = this.enumValueTransformer(
      typeName,
      externalValue,
      enumValueConfig,
    );

    // null means remove the enum value (mapSchema drops null mapper results).
    if (transformedEnumValue === null) {
      return null;
    }

    if (Array.isArray(transformedEnumValue)) {
      const newExternalValue = transformedEnumValue[0];

      if (newExternalValue !== externalValue) {
        if (!this.mapping[typeName]) {
          this.mapping[typeName] = Object.create(null);
          this.reverseMapping[typeName] = Object.create(null);
        }
        this.mapping[typeName]![externalValue] = newExternalValue;
        this.reverseMapping[typeName]![newExternalValue] = externalValue;
        this.noTransformation = false;
      }
      return [
        newExternalValue,
        {
          ...transformedEnumValue[1],
          value: undefined,
        },
      ];
    }

    // undefined means keep the original config metadata; only clear internal value.
    if (transformedEnumValue === undefined) {
      return {
        ...enumValueConfig,
        value: undefined,
      };
    }

    return {
      ...transformedEnumValue,
      value: undefined,
    };
  }
}

function mapEnumValues(
  typeName: string,
  value: string,
  mapping: Record<string, Record<string, string>>,
): string {
  const newExternalValue = mapping[typeName]?.[value];
  return newExternalValue != null ? newExternalValue : value;
}

function generateValueTransformer(
  valueTransformer: Maybe<LeafValueTransformer>,
  mapping: Record<string, Record<string, string>>,
): LeafValueTransformer {
  if (valueTransformer == null) {
    return (typeName, value) => mapEnumValues(typeName, value, mapping);
  } else {
    return (typeName, value) => mapEnumValues(typeName, valueTransformer(typeName, value), mapping);
  }
}
