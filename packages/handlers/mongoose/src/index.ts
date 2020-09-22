import { composeWithMongoose, composeWithMongooseDiscriminators } from 'graphql-compose-mongoose';
import { SchemaComposer } from 'graphql-compose';
import { GetMeshSourceOptions, MeshPubSub, MeshHandler, MeshSource, YamlConfig } from '@graphql-mesh/types';
import { camelCase } from 'camel-case';
import mongoose from 'mongoose';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';

const modelQueryOperations = ['findById', 'findByIds', 'findOne', 'findMany', 'count', 'connection', 'pagination'];

const modelMutationOperations = [
  'createOne',
  'createMany',
  'updateById',
  'updateOne',
  'updateMany',
  'removeById',
  'removeOne',
  'removeMany',
];

export default class MongooseHandler implements MeshHandler {
  private config: YamlConfig.MongooseHandler;
  private pubsub: MeshPubSub;

  constructor({ config, pubsub }: GetMeshSourceOptions<YamlConfig.MongooseHandler>) {
    this.config = config;
    this.pubsub = pubsub;
  }

  async getMeshSource(): Promise<MeshSource> {
    if (this.config.connectionString) {
      await mongoose.connect(this.config.connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      this.pubsub.subscribe('destroy', () => mongoose.disconnect());
    }

    const schemaComposer = new SchemaComposer();

    await Promise.all([
      Promise.all(
        this.config.models?.map(async modelConfig => {
          const model = await loadFromModuleExportExpression<any>(modelConfig.path, modelConfig.name);
          const modelTC = composeWithMongoose(model, modelConfig.options as any);
          await Promise.all([
            Promise.all(
              modelQueryOperations.map(async queryOperation =>
                schemaComposer.Query.addFields({
                  [camelCase(`${modelConfig.name}_${queryOperation}`)]: modelTC.getResolver(queryOperation),
                })
              )
            ),
            Promise.all(
              modelMutationOperations.map(async mutationOperation =>
                schemaComposer.Mutation.addFields({
                  [camelCase(`${modelConfig.name}_${mutationOperation}`)]: modelTC.getResolver(mutationOperation),
                })
              )
            ),
          ]);
        })
      ),
      Promise.all(
        this.config.discriminators.map(async discriminatorConfig => {
          const discriminator = await loadFromModuleExportExpression<any>(
            discriminatorConfig.path,
            discriminatorConfig.name
          );
          const discriminatorTC = composeWithMongooseDiscriminators(discriminator, discriminatorConfig.options as any);
          await Promise.all([
            Promise.all(
              modelQueryOperations.map(async queryOperation =>
                schemaComposer.Query.addFields({
                  [camelCase(`${discriminatorConfig.name}_${queryOperation}`)]: discriminatorTC.getResolver(
                    queryOperation
                  ),
                })
              )
            ),
            Promise.all(
              modelMutationOperations.map(async mutationOperation =>
                schemaComposer.Mutation.addFields({
                  [camelCase(`${discriminatorConfig.name}_${mutationOperation}`)]: discriminatorTC.getResolver(
                    mutationOperation
                  ),
                })
              )
            ),
          ]);
        })
      ),
    ]);

    const schema = schemaComposer.buildSchema();

    return {
      schema,
    };
  }
}
