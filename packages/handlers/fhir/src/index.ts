import JsonSchemaHandler from '@graphql-mesh/json-schema';
import { GetMeshSourceOptions, YamlConfig } from '@graphql-mesh/types';
import { join } from 'path';

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
}
