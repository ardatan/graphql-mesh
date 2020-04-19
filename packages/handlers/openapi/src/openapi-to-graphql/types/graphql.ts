// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/**
 * Custom type definitions for GraphQL.
 */

import {
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLResolveInfo,
} from 'graphql';

export enum GraphQLOperationType {
  Query,
  Mutation,
  // TODO: Subscription
}

export type GraphQLType =
  | GraphQLObjectType
  | GraphQLInputObjectType
  | GraphQLList<any>
  | GraphQLUnionType
  | GraphQLEnumType
  | GraphQLScalarType;

type Arg = {
  type: any;
  description?: string;
};

export type Args = {
  [key: string]: Arg;
};

export type ResolveFunction = (root: any, args: any, ctx: any, info: GraphQLResolveInfo) => Promise<any> | any;

export type Field = {
  type: GraphQLType;
  resolve?: ResolveFunction;
  args?: Args;
  description: string;
};
