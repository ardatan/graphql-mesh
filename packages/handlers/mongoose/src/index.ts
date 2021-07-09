import { composeWithMongoose, composeWithMongooseDiscriminators } from 'graphql-compose-mongoose';
import { SchemaComposer } from 'graphql-compose';
import { GetMeshSourceOptions, MeshPubSub, MeshHandler, MeshSource, YamlConfig, ImportFn } from '@graphql-mesh/types';
import { camelCase } from 'camel-case';
import mongoose from 'mongoose';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { specifiedDirectives } from 'graphql';

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
  private baseDir: string;
  private pubsub: MeshPubSub;
  private importFn: ImportFn;

  constructor({ config, baseDir, pubsub, importFn }: GetMeshSourceOptions<YamlConfig.MongooseHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.importFn = importFn;
  }

  async getMeshSource(): Promise<MeshSource> {
    if (this.config.connectionString) {
      mongoose
        .connect(this.config.connectionString, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        })
        .catch(e => console.error(e));

      this.pubsub.subscribe('destroy', () => mongoose.disconnect());
    }

    const schemaComposer = new SchemaComposer();

    await Promise.all([
      Promise.all(
        this.config.models?.map(async modelConfig => {
          const model = await loadFromModuleExportExpression<mongoose.Model<mongoose.Document<any, any, any>>>(
            modelConfig.path,
            {
              defaultExportName: modelConfig.name,
              cwd: this.baseDir,
              importFn: this.importFn,
            }
          );
          if (!model) {
            throw new Error(`Model ${modelConfig.name} cannot be imported ${modelConfig.path}!`);
          }
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
        }) || []
      ),
      Promise.all(
        this.config.discriminators?.map(async discriminatorConfig => {
          const discriminator = await loadFromModuleExportExpression<any>(discriminatorConfig.path, {
            defaultExportName: discriminatorConfig.name,
            cwd: this.baseDir,
            importFn: this.importFn,
          });
          const discriminatorTC = composeWithMongooseDiscriminators(discriminator, discriminatorConfig.options as any);
          await Promise.all([
            Promise.all(
              modelQueryOperations.map(async queryOperation =>
                schemaComposer.Query.addFields({
                  [camelCase(`${discriminatorConfig.name}_${queryOperation}`)]:
                    discriminatorTC.getResolver(queryOperation),
                })
              )
            ),
            Promise.all(
              modelMutationOperations.map(async mutationOperation =>
                schemaComposer.Mutation.addFields({
                  [camelCase(`${discriminatorConfig.name}_${mutationOperation}`)]:
                    discriminatorTC.getResolver(mutationOperation),
                })
              )
            ),
          ]);
        }) || []
      ),
    ]);

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => schemaComposer.addDirective(directive));

    const schema = schemaComposer.buildSchema();

    return {
      schema,
    };
  }
}
