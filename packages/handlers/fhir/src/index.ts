import JsonSchemaHandler from '@graphql-mesh/json-schema';
import { GetMeshSourceOptions, YamlConfig } from '@graphql-mesh/types';
import { join } from 'path';
import { getCachedFetch } from '@graphql-mesh/utils';
import urljoin from 'url-join';

const fhirSchema = require('./fhir.schema.json');

export default class FhirHandler extends JsonSchemaHandler {
  constructor(options: GetMeshSourceOptions<YamlConfig.FhirHandler>) {
    const operations: YamlConfig.JsonSchemaOperation[] = [
      {
        type: 'Query' as any,
        field: 'resource',
        path: `/{args.type}/{args.id}?_format=application/json`,
        method: 'GET',
        responseTypeName: 'ResourceList',
      },
    ];
    fhirSchema.definitions.ResourceList.oneOf.forEach(({ $ref }: any) => {
      const resourceName = $ref.split('/').pop();
      if (resourceName !== 'Subscription') {
        operations.push({
          type: 'Query' as any,
          field: resourceName,
          path: `/${resourceName}/{args.id}?_format=application/json`,
          method: 'GET',
          responseTypeName: resourceName,
        });
        operations.push({
          type: 'Query' as any,
          field: `search${resourceName}`,
          path: `/${resourceName}/?name={args.name}&_format=application/json`,
          method: 'GET',
          responseTypeName: 'Bundle',
        });
        fhirSchema.definitions.ResourceList.oneOf.forEach(({ $ref: $ref2 }: any) => {
          const resourceName2 = $ref2.split('/').pop();
          if (resourceName2 !== 'Subscription') {
            operations.push({
              type: 'Query' as any,
              field: `${resourceName}By${resourceName2}`,
              path: `/${resourceName}?subject=${resourceName2}/{args.${resourceName2}ID}`,
              method: 'GET',
              responseTypeName: 'Bundle',
            });
          }
        });
      }
    });
    super({
      ...options,
      config: {
        baseUrl: options.config.endpoint,
        baseSchema: join(__dirname, './fhir.schema.json'),
        operations,
      },
    });
  }

  async getMeshSource(): Promise<any> {
    const source = await super.getMeshSource();
    const ReferenceOTS = this.schemaComposer.getOTC('Reference');
    const fetch = getCachedFetch(this.cache);
    ReferenceOTS.addFields({
      resource: {
        type: 'ResourceList',
        resolve: async ({ reference }: any) => {
          const [type, id] = reference.split('/');
          const response = await fetch(urljoin(this.config.baseUrl, `/${type}/${id}?_format=application/json`), {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          });
          return response.json();
        },
      },
    });
    this.schemaComposer.getUTC('ResourceList').setResolveType(root => root.resourceType);
    source.schema = this.schemaComposer.buildSchema();
    return source;
  }
}
