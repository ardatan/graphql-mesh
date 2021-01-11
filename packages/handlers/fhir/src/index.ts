import JsonSchemaHandler from '@graphql-mesh/json-schema';
import { YamlConfig } from '@graphql-mesh/utils';
import { join } from 'path';
import urljoin from 'url-join';

const fhirSchema = require('./fhir.schema.json');

export default class FhirHandler extends JsonSchemaHandler {
  private endpoint: string;
  constructor(name: string, config: YamlConfig.FhirHandler) {
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
    super(name, {
      baseUrl: config.endpoint,
      baseSchema: join(__dirname, './fhir.schema.json'),
      operations,
    });
    this.endpoint = config.endpoint;
  }

  async getMeshSource(): Promise<any> {
    const source = await super.getMeshSource();
    const ReferenceOTS = this.schemaComposer.getOTC('Reference');
    ReferenceOTS.addFields({
      resource: {
        type: 'ResourceList',
        resolve: async ({ reference }: any) => {
          const [type, id] = reference.split('/');
          const response = await this.handlerContext.fetch(
            urljoin(this.endpoint, `/${type}/${id}?_format=application/json`),
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
            }
          );
          return response.json();
        },
      },
    });
    source.schema = this.schemaComposer.buildSchema();
    return source;
  }
}
