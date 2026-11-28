import {
  type FieldNode,
  type GraphQLEnumType,
  type GraphQLEnumValueConfig,
  type GraphQLFieldConfig,
  type GraphQLInputFieldConfig,
  type GraphQLInputObjectType,
  type GraphQLInterfaceType,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type SelectionSetNode,
} from 'graphql';
import { type Subschema, type SubschemaConfig } from '@graphql-tools/delegate';
import { type IExecutableSchemaDefinition } from '@graphql-tools/schema';
import type { Maybe, TypeSource } from '@graphql-tools/utils';

export interface MergeTypeCandidate<TContext = Record<string, any>> {
  type: GraphQLNamedType;
  subschema?: GraphQLSchema | SubschemaConfig<any, any, any, TContext>;
  transformedSubschema?: Subschema<any, any, any, TContext>;
}

export interface MergeFieldConfigCandidate<TContext = Record<string, any>> {
  fieldConfig: GraphQLFieldConfig<any, TContext>;
  fieldName: string;
  type: GraphQLObjectType | GraphQLInterfaceType;
  subschema?: GraphQLSchema | SubschemaConfig<any, any, any, TContext>;
  transformedSubschema?: Subschema<any, any, any, TContext>;
}

export interface MergeInputFieldConfigCandidate<TContext = Record<string, any>> {
  inputFieldConfig: GraphQLInputFieldConfig;
  fieldName: string;
  type: GraphQLInputObjectType;
  subschema?: GraphQLSchema | SubschemaConfig<any, any, any, TContext>;
  transformedSubschema?: Subschema<any, any, any, TContext>;
}

export interface MergeEnumValueConfigCandidate<TContext = Record<string, any>> {
  enumValueConfig: GraphQLEnumValueConfig;
  enumValue: string;
  type: GraphQLEnumType;
  subschema?: GraphQLSchema | SubschemaConfig<any, any, any, TContext>;
  transformedSubschema?: Subschema<any, any, any, TContext>;
}

export type MergeTypeFilter<TContext = Record<string, any>> = (
  mergeTypeCandidates: Array<MergeTypeCandidate<TContext>>,
  typeName: string,
) => boolean;

export interface IStitchSchemasOptions<TContext = Record<string, any>> extends Omit<
  IExecutableSchemaDefinition<TContext>,
  'typeDefs'
> {
  subschemas?: Array<GraphQLSchema | SubschemaConfig<any, any, any, TContext>>;
  typeDefs?: TypeSource;
  types?: Array<GraphQLNamedType>;
  onTypeConflict?: OnTypeConflict<TContext>;
  /**
   * Should directive definitions from all subschemas be collected and included in the stitched schema.
   *
   * When false, custom directive definitions are excluded and their usages are stripped from all type
   * and field AST nodes.
   *
   * @default true
   */
  mergeDirectives?: boolean | undefined;
  mergeTypes?: boolean | Array<string> | MergeTypeFilter<TContext>;
  typeMergingOptions?: TypeMergingOptions<TContext>;
  subschemaConfigTransforms?: Array<SubschemaConfigTransform<TContext>>;
  /**
   * Federation `@context` providers: context name -> type names that declare
   * that context. Copied onto `stitchingInfo.contextProviders` so the backbone
   * planner can attach `@fromContext` rewrites.
   *
   * Pass this from `getStitchingOptionsFromSupergraphSdl` (or explicitly when
   * calling `stitchSchemas`). There is no `schema.extensions` fallback.
   */
  contextProviders?: Record<string, string[]>;
  /**
   * Known progressive-override labels from the supergraph. Passed through to
   * `attachBackboneExecutor` and stored flat on `stitchingInfo.overrideLabels`
   * for plan-cache keying.
   */
  overrideLabels?: Iterable<string>;
  /**
   * Progressive override label handler. Passed through to
   * `attachBackboneExecutor` with `overrideLabels` and stored flat on
   * `stitchingInfo.handleProgressiveOverride`.
   */
  handleProgressiveOverride?: (label: string, context: any) => boolean | Promise<boolean>;
}

export type SubschemaConfigTransform<TContext = Record<string, any>> = (
  subschemaConfig: SubschemaConfig<any, any, any, TContext>,
) => SubschemaConfig<any, any, any, TContext> | Array<SubschemaConfig<any, any, any, TContext>>;

export interface TypeMergingOptions<TContext = Record<string, any>> {
  validationSettings?: ValidationSettings;
  validationScopes?: Record<string, ValidationSettings>;
  typeCandidateMerger?: (
    candidates: Array<MergeTypeCandidate<TContext>>,
  ) => MergeTypeCandidate<TContext>;
  typeDescriptionsMerger?: (candidates: Array<MergeTypeCandidate<TContext>>) => Maybe<string>;
  fieldConfigMerger?: (
    candidates: Array<MergeFieldConfigCandidate<TContext>>,
  ) => GraphQLFieldConfig<any, TContext>;
  inputFieldConfigMerger?: (
    candidates: Array<MergeInputFieldConfigCandidate<TContext>>,
  ) => GraphQLInputFieldConfig;
  enumValueConfigMerger?: (
    candidates: Array<MergeEnumValueConfigCandidate<TContext>>,
  ) => GraphQLEnumValueConfig;
  useNonNullableFieldOnConflict?: boolean;
}

export enum ValidationLevel {
  Error = 'error',
  Warn = 'warn',
  Off = 'off',
}

export interface ValidationSettings {
  validationLevel?: ValidationLevel;
  strictNullComparison?: boolean;
  proxiableScalars?: Record<string, Array<string>>;
}

export type OnTypeConflict<TContext = Record<string, any>> = (
  left: GraphQLNamedType,
  right: GraphQLNamedType,
  info?: {
    left: {
      subschema?: GraphQLSchema | SubschemaConfig<any, any, any, TContext>;
      transformedSubschema?: Subschema<any, any, any, TContext>;
    };
    right: {
      subschema?: GraphQLSchema | SubschemaConfig<any, any, any, TContext>;
      transformedSubschema?: Subschema<any, any, any, TContext>;
    };
  },
) => GraphQLNamedType;

declare module '@graphql-tools/utils' {
  interface IFieldResolverOptions<TSource = any, TContext = any, TArgs = any> {
    selectionSet?: string | ((node: FieldNode) => SelectionSetNode);
  }
}
