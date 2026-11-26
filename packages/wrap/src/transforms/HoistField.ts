import {
  getNamedType,
  getNullableType,
  GraphQLList,
  isListType,
  Kind,
  print,
  type ArgumentNode,
  type FieldNode,
  type GraphQLArgument,
  type GraphQLError,
  type GraphQLFieldConfig,
  type GraphQLFieldResolver,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLSchema,
  type OperationTypeNode,
} from 'graphql';
import {
  defaultMergedResolver,
  type DelegationContext,
  type SubschemaConfig,
  type Transform,
} from '@graphql-tools/delegate';
import {
  appendObjectFields,
  relocatedError,
  removeObjectFields,
  type ExecutionRequest,
  type ExecutionResult,
} from '@graphql-tools/utils';
import { defaultCreateProxyingResolver } from '../generateProxyingResolvers.js';
import MapFields from './MapFields.js';

interface HoistFieldTransformationContext extends Record<string, any> {
  wrapperAliases?: Set<string>;
}

export default class HoistField<
  TContext extends Record<string, any> = Record<string, any>,
> implements Transform<HoistFieldTransformationContext, TContext> {
  private readonly typeName: string;
  private readonly newFieldName: string;
  private readonly pathToField: Array<string>;
  private readonly oldFieldName: string;
  private readonly argFilters: Array<(arg: GraphQLArgument) => boolean>;
  private readonly argLevels: Record<string, number>;
  private readonly alias: string;
  private readonly transformer: MapFields<TContext>;

  constructor(
    typeName: string,
    pathConfig: Array<
      string | { fieldName: string; argFilter?: (arg: GraphQLArgument) => boolean }
    >,
    newFieldName: string,
    alias = '__gqtlw__',
  ) {
    this.typeName = typeName;
    this.newFieldName = newFieldName;
    this.alias = alias;

    const path = pathConfig.map(segment =>
      typeof segment === 'string' ? segment : segment.fieldName,
    );
    this.argFilters = pathConfig.map((segment, index) => {
      if (typeof segment === 'string' || segment.argFilter == null) {
        return index === pathConfig.length - 1 ? () => true : () => false;
      }
      return segment.argFilter;
    });

    const pathToField = path.slice();
    const oldFieldName = pathToField.pop();

    if (oldFieldName == null) {
      throw new Error(
        `Cannot hoist field to ${newFieldName} on type ${typeName}, no path provided.`,
      );
    }

    this.oldFieldName = oldFieldName;
    this.pathToField = pathToField;
    const argLevels = Object.create(null);
    this.transformer = new MapFields(
      {
        [typeName]: {
          [newFieldName]: (fieldNode, _fragments, transformationContext) =>
            wrapFieldNode(
              renameFieldNode(fieldNode, oldFieldName),
              pathToField,
              alias,
              argLevels,
              transformationContext as HoistFieldTransformationContext,
            ),
        },
      },
      {
        [typeName]: (value, transformationContext) =>
          unwrapValue(value, alias, transformationContext as HoistFieldTransformationContext),
      },
      (errors, transformationContext) =>
        errors != null
          ? unwrapErrors(errors, alias, transformationContext as HoistFieldTransformationContext)
          : undefined,
    );
    this.argLevels = argLevels;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  ): GraphQLSchema {
    const argsMap: Record<string, GraphQLArgument> = Object.create(null);
    let listDepth = 0;
    const innerType: GraphQLObjectType = this.pathToField.reduce(
      (acc, pathSegment, index) => {
        const field = acc.getFields()[pathSegment];
        for (const arg of field!.args) {
          if (this.argFilters[index]!(arg)) {
            argsMap[arg.name] = arg;
            this.argLevels[arg.name] = index;
          }
        }
        const nullableType = getNullableType(field?.type);
        if (isListType(nullableType)) {
          listDepth += 1;
          return getNamedType(nullableType) as any;
        }

        return nullableType as GraphQLObjectType;
      },
      originalWrappingSchema.getType(this.typeName) as GraphQLObjectType,
    );

    let [newSchema, targetFieldConfigMap] = removeObjectFields(
      originalWrappingSchema,
      innerType.name,
      fieldName => fieldName === this.oldFieldName,
    );

    const targetField = targetFieldConfigMap[this.oldFieldName];

    let resolve: GraphQLFieldResolver<any, any>;
    const hoistingToRootField =
      this.typeName === originalWrappingSchema.getQueryType()?.name ||
      this.typeName === originalWrappingSchema.getMutationType()?.name;

    if (hoistingToRootField) {
      // Use the wrapping schema's query root so renamed query roots still
      // select the query operation (not the upstream schema's type names).
      const operation =
        this.typeName === originalWrappingSchema.getQueryType()?.name ? 'query' : 'mutation';
      const createProxyingResolver =
        subschemaConfig.createProxyingResolver ?? defaultCreateProxyingResolver;
      resolve = createProxyingResolver({
        subschemaConfig,
        operation: operation as OperationTypeNode,
        fieldName: this.newFieldName,
      });
    } else {
      resolve = defaultMergedResolver;
    }

    const newTargetField = {
      ...targetField,
      resolve: resolve!,
    };

    const level = this.pathToField.length;

    const args = targetField?.args;
    if (args != null) {
      for (const argName in args) {
        const argConfig = args[argName];
        if (argConfig == null) {
          continue;
        }
        const arg = {
          ...argConfig,
          name: argName,
          description: argConfig.description,
          defaultValue: argConfig.defaultValue,
          extensions: argConfig.extensions,
          astNode: argConfig.astNode,
        } as GraphQLArgument;
        if (this.argFilters[level]?.(arg)) {
          argsMap[argName] = arg;
          this.argLevels[arg.name] = level;
        }
      }
    }

    newTargetField.args = argsMap;

    if (listDepth > 0) {
      let wrappedType = newTargetField.type as GraphQLOutputType;
      for (let i = 0; i < listDepth; i++) {
        wrappedType = new GraphQLList(wrappedType);
      }
      newTargetField.type = wrappedType;

      // Root hoists already delegate once via the proxying resolver; only
      // non-root parents need per-list-item extraction from the parent value.
      if (!hoistingToRootField) {
        const resolver = newTargetField.resolve;
        newTargetField.resolve = createListItemResolver(resolver, listDepth);
      }
    }

    newSchema = appendObjectFields(newSchema, this.typeName, {
      [this.newFieldName]: newTargetField as GraphQLFieldConfig<any, any>,
    });

    return this.transformer.transformSchema(newSchema, subschemaConfig);
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext<TContext>,
    transformationContext: HoistFieldTransformationContext,
  ): ExecutionRequest {
    transformationContext.wrapperAliases = new Set();
    return this.transformer.transformRequest(
      originalRequest,
      delegationContext,
      transformationContext,
    );
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext<TContext>,
    transformationContext: HoistFieldTransformationContext,
  ): ExecutionResult {
    return this.transformer.transformResult(
      originalResult,
      delegationContext,
      transformationContext,
    );
  }
}

function createListItemResolver(
  resolver: GraphQLFieldResolver<any, any>,
  depth: number,
): GraphQLFieldResolver<any, any> {
  if (depth <= 0) {
    return resolver;
  }
  const inner = createListItemResolver(resolver, depth - 1);
  return (parent, args, context, info) =>
    Promise.all(
      (Object.keys(parent) as string[])
        .filter(key => !isNaN(parseInt(key, 10)))
        .map(key => inner(parent[key], args, context, info)),
    );
}

function argsSuffix(
  arguments_: ReadonlyArray<ArgumentNode> | undefined,
  level: number,
  argLevels: Record<string, number>,
): string {
  if (arguments_ == null || arguments_.length === 0) {
    return '';
  }
  const levelArgs = arguments_.filter(arg => argLevels[arg.name.value] === level);
  if (levelArgs.length === 0) {
    return '';
  }
  // Stable key from the printed argument AST so compatible selections share a
  // response key while differing arguments get distinct aliases.
  return print({
    kind: Kind.FIELD,
    name: { kind: Kind.NAME, value: '_' },
    arguments: levelArgs,
  }).slice(1);
}

export function wrapFieldNode(
  fieldNode: FieldNode,
  path: Array<string>,
  alias: string,
  argLevels: Record<string, number>,
  transformationContext?: HoistFieldTransformationContext,
): FieldNode {
  const wrapperAliases = transformationContext?.wrapperAliases;

  return path.reduceRight(
    (acc, fieldName, index) => {
      const levelAlias = alias + argsSuffix(fieldNode.arguments, index, argLevels);
      wrapperAliases?.add(levelAlias);
      return {
        kind: Kind.FIELD,
        alias: {
          kind: Kind.NAME,
          value: levelAlias,
        },
        name: {
          kind: Kind.NAME,
          value: fieldName,
        },
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: [acc],
        },
        arguments:
          fieldNode.arguments != null
            ? fieldNode.arguments.filter(arg => argLevels[arg.name.value] === index)
            : undefined,
      };
    },
    {
      ...fieldNode,
      arguments:
        fieldNode.arguments != null
          ? fieldNode.arguments.filter(arg => argLevels[arg.name.value] === path.length)
          : undefined,
    },
  );
}

export function renameFieldNode(fieldNode: FieldNode, name: string): FieldNode {
  return {
    ...fieldNode,
    alias: {
      kind: Kind.NAME,
      value: fieldNode.alias != null ? fieldNode.alias.value : fieldNode.name.value,
    },
    name: {
      kind: Kind.NAME,
      value: name,
    },
  };
}

function isWrapperAlias(key: string, alias: string, wrapperAliases?: Set<string>): boolean {
  if (wrapperAliases != null && wrapperAliases.size > 0) {
    return wrapperAliases.has(key);
  }
  return key === alias || key.startsWith(alias);
}

function unwrapObject(value: any, alias: string, wrapperAliases?: Set<string>): any {
  if (value == null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => unwrapObject(item, alias, wrapperAliases));
  }

  const wrapperKey = (Object.keys(value) as string[]).find(key =>
    isWrapperAlias(key, alias, wrapperAliases),
  );
  if (wrapperKey == null) {
    return value;
  }

  let nested = value[wrapperKey];
  while (nested != null && typeof nested === 'object' && !Array.isArray(nested)) {
    const nextKey = (Object.keys(nested) as string[]).find(key =>
      isWrapperAlias(key, alias, wrapperAliases),
    );
    if (nextKey == null) {
      break;
    }
    nested = nested[nextKey];
  }

  if (Array.isArray(nested)) {
    return unwrapObject(nested, alias, wrapperAliases);
  }

  return unwrapObject(nested, alias, wrapperAliases);
}

export function unwrapValue(
  originalValue: any,
  alias: string,
  transformationContext?: HoistFieldTransformationContext,
): any {
  if (originalValue == null || typeof originalValue !== 'object') {
    return originalValue;
  }

  const wrapperAliases = transformationContext?.wrapperAliases;
  const wrapperKeys = (Object.keys(originalValue) as string[]).filter(key =>
    isWrapperAlias(key, alias, wrapperAliases),
  );

  if (wrapperKeys.length === 0) {
    return originalValue;
  }

  for (const wrapperKey of wrapperKeys) {
    const unwrapped = unwrapObject(originalValue[wrapperKey], alias, wrapperAliases);
    delete originalValue[wrapperKey];
    if (unwrapped != null && typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
      Object.assign(originalValue, unwrapped);
    }
  }

  return originalValue;
}

function unwrapErrors(
  errors: ReadonlyArray<GraphQLError>,
  alias: string,
  transformationContext?: HoistFieldTransformationContext,
): Array<GraphQLError> {
  const wrapperAliases = transformationContext?.wrapperAliases;
  return errors.map(error => {
    const originalPath = error.path;
    if (originalPath == null) {
      return error;
    }

    // Remove only hoist-generated wrapper segments; preserve client response keys
    // even when they happen to match the base alias string.
    const newPath = originalPath.filter(
      pathSegment =>
        typeof pathSegment !== 'string' || !isWrapperAlias(pathSegment, alias, wrapperAliases),
    );

    return relocatedError(error, newPath);
  });
}
