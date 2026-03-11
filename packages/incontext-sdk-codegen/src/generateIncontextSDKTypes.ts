import type { GraphQLObjectType, GraphQLSchema, NamedTypeNode } from 'graphql';
import { getNamedType, isAbstractType, Kind } from 'graphql';
import { pascalCase } from 'pascal-case';
import { codegen } from '@graphql-codegen/core';
import { getCachedDocumentNodeFromSchema } from '@graphql-codegen/plugin-helpers';
import * as tsBasePlugin from '@graphql-codegen/typescript';
import type { Maybe } from '@graphql-mesh/types';

class CodegenHelpers extends tsBasePlugin.TsVisitor {
  public getTypeToUse(namedType: NamedTypeNode, isVisitingInputType: boolean): string {
    if (this.scalars[namedType.name.value]) {
      return this._getScalar(namedType.name.value, isVisitingInputType ? 'input' : 'output');
    }

    return this._getTypeForNode(namedType, isVisitingInputType);
  }
}

function buildSignatureBasedOnRootFields(
  codegenHelpers: CodegenHelpers,
  type: Maybe<GraphQLObjectType>,
  schema: GraphQLSchema,
  unifiedContextIdentifier: string,
): Record<string, string> {
  if (!type) {
    return {};
  }

  const fields = type.getFields();
  const operationMap: Record<string, string> = {};
  for (const fieldName in fields) {
    const field = fields[fieldName];
    const argsExists = field.args && field.args.length > 0;
    const argsName = argsExists ? `${type.name}${field.name}Args` : '{}';
    const parentTypeNode: NamedTypeNode = {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: type.name,
      },
    };

    const namedFieldType = getNamedType(field.type);

    const fieldDescriptionBlock = field.description ? `/** ${field.description} **/\n` : '';

    if (isAbstractType(namedFieldType)) {
      const possibleTypes = schema.getPossibleTypes(namedFieldType);
      const typeNamesDef = possibleTypes
        .map(possibleType =>
          codegenHelpers.getTypeToUse(
            {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: possibleType.name,
              },
            },
            false,
          ),
        )
        .join(' | ');
      const originalDef = field.type.toString();
      const def = originalDef.replace(namedFieldType.name, typeNamesDef);
      operationMap[fieldName] = `  ${fieldDescriptionBlock}  ${
        field.name
      }: InContextSdkMethod<${def}, ${argsName}, ${unifiedContextIdentifier}>`;
    } else {
      operationMap[fieldName] = `  ${fieldDescriptionBlock}\n  ${
        field.name
      }: InContextSdkMethod<${codegenHelpers.getTypeToUse(
        parentTypeNode,
        false,
      )}['${fieldName}'], ${argsName}, ${unifiedContextIdentifier}>`;
    }
  }
  return operationMap;
}

export async function generateIncontextSDKTypes(options: {
  schema: GraphQLSchema;
  name: string;
  contextVariables: Record<string, string>;
  flattenTypes: boolean;
  codegenConfig: any;
  unifiedContextIdentifier: string;
}) {
  const config = {
    skipTypename: true,
    flattenGeneratedTypes: options.flattenTypes,
    onlyOperationTypes: options.flattenTypes,
    preResolveTypes: options.flattenTypes,
    namingConvention: 'keep',
    enumsAsTypes: true,
    ignoreEnumValuesFromSchema: true,
    useIndexSignature: true,
    ...options.codegenConfig,
  };
  const baseTypes = await codegen({
    filename: options.name + '_types.ts',
    documents: [],
    config,
    schemaAst: options.schema,
    schema: getCachedDocumentNodeFromSchema(options.schema),
    skipDocumentsValidation: true,
    plugins: [
      {
        typescript: {},
      },
    ],
    pluginMap: {
      typescript: tsBasePlugin,
    },
  });
  const codegenHelpers = new CodegenHelpers(options.schema, config, {});
  const namespace = pascalCase(`${options.name}Types`);
  const queryOperationMap = buildSignatureBasedOnRootFields(
    codegenHelpers,
    options.schema.getQueryType(),
    options.schema,
    options.unifiedContextIdentifier,
  );
  const mutationOperationMap = buildSignatureBasedOnRootFields(
    codegenHelpers,
    options.schema.getMutationType(),
    options.schema,
    options.unifiedContextIdentifier,
  );
  const subscriptionsOperationMap = buildSignatureBasedOnRootFields(
    codegenHelpers,
    options.schema.getSubscriptionType(),
    options.schema,
    options.unifiedContextIdentifier,
  );

  const codeAst = `
import type { InContextSdkMethod } from '@graphql-mesh/types';

export namespace ${namespace} {
  ${baseTypes}
  export type QuerySdk = {
    ${Object.values(queryOperationMap).join(',\n')}
  };

  export type MutationSdk = {
    ${Object.values(mutationOperationMap).join(',\n')}
  };

  export type SubscriptionSdk = {
    ${Object.values(subscriptionsOperationMap).join(',\n')}
  };

  export type Context = {
      [${JSON.stringify(
        options.name,
      )}]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      ${Object.keys(options.contextVariables)
        .map(key => `[${JSON.stringify(key)}]: ${options.contextVariables[key]}`)
        .join(',\n')}
    };
}
`;

  return {
    identifier: namespace,
    codeAst,
  };
}

export function generateUnifiedContextTypeFromIdentifiers(identifiers: string[]): string {
  if (identifiers.length === 0) {
    return 'export type MeshInContextSDK = {};';
  }
  return `export type MeshInContextSDK = ${identifiers
    .map(identifier => `${identifier}.Context`)
    .filter(Boolean)
    .join(' & ')};`;
}
