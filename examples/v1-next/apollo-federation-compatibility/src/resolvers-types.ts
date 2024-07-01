import { GraphQLResolveInfo } from 'graphql';

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

export type CaseStudy = {
  __typename?: 'CaseStudy';
  caseNumber: Scalars['ID']['output'];
  description?: Maybe<Scalars['String']['output']>;
};

export type DeprecatedProduct = {
  __typename?: 'DeprecatedProduct';
  createdBy?: Maybe<User>;
  package: Scalars['String']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  sku: Scalars['String']['output'];
};

export type Inventory = {
  __typename?: 'Inventory';
  deprecatedProducts: Array<DeprecatedProduct>;
  id: Scalars['ID']['output'];
};

export type Product = {
  __typename?: 'Product';
  createdBy?: Maybe<User>;
  dimensions?: Maybe<ProductDimension>;
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  package?: Maybe<Scalars['String']['output']>;
  research: Array<ProductResearch>;
  sku?: Maybe<Scalars['String']['output']>;
  variation?: Maybe<ProductVariation>;
};

export type ProductDimension = {
  __typename?: 'ProductDimension';
  size?: Maybe<Scalars['String']['output']>;
  unit?: Maybe<Scalars['String']['output']>;
  weight?: Maybe<Scalars['Float']['output']>;
};

export type ProductResearch = {
  __typename?: 'ProductResearch';
  outcome?: Maybe<Scalars['String']['output']>;
  study: CaseStudy;
};

export type ProductVariation = {
  __typename?: 'ProductVariation';
  id: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** @deprecated Use product query instead */
  deprecatedProduct?: Maybe<DeprecatedProduct>;
  inventory?: Maybe<Inventory>;
  product?: Maybe<Product>;
  productBySkuAndPackage?: Maybe<Product>;
  productBySkuAndVariationId?: Maybe<Product>;
  productResearch?: Maybe<ProductResearch>;
  user?: Maybe<User>;
};

export type QueryDeprecatedProductArgs = {
  package: Scalars['String']['input'];
  sku: Scalars['String']['input'];
};

export type QueryInventoryArgs = {
  id: Scalars['ID']['input'];
};

export type QueryProductArgs = {
  id: Scalars['ID']['input'];
};

export type QueryProductBySkuAndPackageArgs = {
  package: Scalars['String']['input'];
  sku: Scalars['String']['input'];
};

export type QueryProductBySkuAndVariationIdArgs = {
  sku: Scalars['String']['input'];
  variationId: Scalars['ID']['input'];
};

export type QueryProductResearchArgs = {
  caseNumber: Scalars['ID']['input'];
};

export type QueryUserArgs = {
  email: Scalars['ID']['input'];
  totalProductsCreated?: InputMaybe<Scalars['Int']['input']>;
  yearsOfEmployment?: InputMaybe<Scalars['Int']['input']>;
};

export type User = {
  __typename?: 'User';
  averageProductsCreatedPerYear?: Maybe<Scalars['Int']['output']>;
  email: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  totalProductsCreated?: Maybe<Scalars['Int']['output']>;
  yearsOfEmployment: Scalars['Int']['output'];
};

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {},
> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo,
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CaseStudy: ResolverTypeWrapper<CaseStudy>;
  DeprecatedProduct: ResolverTypeWrapper<DeprecatedProduct>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Inventory: ResolverTypeWrapper<Inventory>;
  Product: ResolverTypeWrapper<Product>;
  ProductDimension: ResolverTypeWrapper<ProductDimension>;
  ProductResearch: ResolverTypeWrapper<ProductResearch>;
  ProductVariation: ResolverTypeWrapper<ProductVariation>;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  User: ResolverTypeWrapper<User>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  CaseStudy: CaseStudy;
  DeprecatedProduct: DeprecatedProduct;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Inventory: Inventory;
  Product: Product;
  ProductDimension: ProductDimension;
  ProductResearch: ProductResearch;
  ProductVariation: ProductVariation;
  Query: {};
  String: Scalars['String']['output'];
  User: User;
};

export type CustomDirectiveArgs = {};

export type CustomDirectiveResolver<
  Result,
  Parent,
  ContextType = any,
  Args = CustomDirectiveArgs,
> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type CaseStudyResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CaseStudy'] = ResolversParentTypes['CaseStudy'],
> = {
  caseNumber?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DeprecatedProductResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['DeprecatedProduct'] = ResolversParentTypes['DeprecatedProduct'],
> = {
  createdBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  package?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sku?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InventoryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Inventory'] = ResolversParentTypes['Inventory'],
> = {
  deprecatedProducts?: Resolver<
    Array<ResolversTypes['DeprecatedProduct']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProductResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product'],
> = {
  createdBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  dimensions?: Resolver<Maybe<ResolversTypes['ProductDimension']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  package?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  research?: Resolver<Array<ResolversTypes['ProductResearch']>, ParentType, ContextType>;
  sku?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  variation?: Resolver<Maybe<ResolversTypes['ProductVariation']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProductDimensionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ProductDimension'] = ResolversParentTypes['ProductDimension'],
> = {
  size?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  unit?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  weight?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProductResearchResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ProductResearch'] = ResolversParentTypes['ProductResearch'],
> = {
  outcome?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  study?: Resolver<ResolversTypes['CaseStudy'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProductVariationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ProductVariation'] = ResolversParentTypes['ProductVariation'],
> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query'],
> = {
  deprecatedProduct?: Resolver<
    Maybe<ResolversTypes['DeprecatedProduct']>,
    ParentType,
    ContextType,
    RequireFields<QueryDeprecatedProductArgs, 'package' | 'sku'>
  >;
  inventory?: Resolver<
    Maybe<ResolversTypes['Inventory']>,
    ParentType,
    ContextType,
    RequireFields<QueryInventoryArgs, 'id'>
  >;
  product?: Resolver<
    Maybe<ResolversTypes['Product']>,
    ParentType,
    ContextType,
    RequireFields<QueryProductArgs, 'id'>
  >;
  productBySkuAndPackage?: Resolver<
    Maybe<ResolversTypes['Product']>,
    ParentType,
    ContextType,
    RequireFields<QueryProductBySkuAndPackageArgs, 'package' | 'sku'>
  >;
  productBySkuAndVariationId?: Resolver<
    Maybe<ResolversTypes['Product']>,
    ParentType,
    ContextType,
    RequireFields<QueryProductBySkuAndVariationIdArgs, 'sku' | 'variationId'>
  >;
  productResearch?: Resolver<
    Maybe<ResolversTypes['ProductResearch']>,
    ParentType,
    ContextType,
    RequireFields<QueryProductResearchArgs, 'caseNumber'>
  >;
  user?: Resolver<
    Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<QueryUserArgs, 'email'>
  >;
};

export type UserResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User'],
> = {
  averageProductsCreatedPerYear?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  totalProductsCreated?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  yearsOfEmployment?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  CaseStudy?: CaseStudyResolvers<ContextType>;
  DeprecatedProduct?: DeprecatedProductResolvers<ContextType>;
  Inventory?: InventoryResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductDimension?: ProductDimensionResolvers<ContextType>;
  ProductResearch?: ProductResearchResolvers<ContextType>;
  ProductVariation?: ProductVariationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

export type DirectiveResolvers<ContextType = any> = {
  custom?: CustomDirectiveResolver<any, any, ContextType>;
};
