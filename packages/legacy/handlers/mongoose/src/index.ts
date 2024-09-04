import { specifiedDirectives } from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import { composeWithMongoose, composeWithMongooseDiscriminators } from 'graphql-compose-mongoose';
import type { ConnectOptions, Document, Model } from 'mongoose';
import { connect, disconnect } from 'mongoose';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type {
  ImportFn,
  Logger,
  MeshHandler,
  MeshHandlerOptions,
  MeshPubSub,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';

const modelQueryOperations = [
  'findById',
  'findByIds',
  'findOne',
  'findMany',
  'count',
  'connection',
  'pagination',
  'dataLoader',
  'dataLoaderMany',
];

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
  private logger: Logger;

  constructor({
    name,
    config,
    baseDir,
    pubsub,
    importFn,
    logger,
  }: MeshHandlerOptions<YamlConfig.MongooseHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.importFn = importFn;
    this.logger = logger;
  }

  async getMeshSource(): Promise<MeshSource> {
    if (this.config.connectionString) {
      const interpolatedConnectionString = stringInterpolator.parse(this.config.connectionString, {
        env: process.env,
      });
      connect(interpolatedConnectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      } as ConnectOptions).catch(e => this.logger.error(e));

      const id = this.pubsub.subscribe('destroy', () => {
        disconnect()
          .catch(e => this.logger.error(e))
          .finally(() => this.pubsub.unsubscribe(id));
      });
    }

    const schemaComposer = new SchemaComposer();
    const typeMergingOptions: MeshSource['merge'] = {};

    await Promise.all([
      Promise.all(
        this.config.models?.map(async modelConfig => {
          const model = await loadFromModuleExportExpression<Model<Document<any, any, any>>>(
            modelConfig.path,
            {
              defaultExportName: modelConfig.name,
              cwd: this.baseDir,
              importFn: this.importFn,
            },
          );
          if (!model) {
            throw new Error(`Model ${modelConfig.name} cannot be imported ${modelConfig.path}!`);
          }
          const modelTC = composeWithMongoose(model, modelConfig.options as any);

          const resolversOption = modelConfig.options?.resolvers;
          function isResolverEnabled(operation): boolean {
            return (
              resolversOption == null ||
              Object.prototype.hasOwnProperty.call(resolversOption, operation) ||
              resolversOption[operation] !== false
            );
          }

          const enabledQueryOperations = modelQueryOperations.filter(isResolverEnabled);
          const enabledMutationOperations = modelMutationOperations.filter(isResolverEnabled);

          await Promise.all([
            Promise.all(
              enabledQueryOperations.map(async queryOperation =>
                schemaComposer.Query.addFields({
                  [`${modelConfig.name}_${queryOperation}`]: modelTC.getResolver(queryOperation),
                }),
              ),
            ),
            Promise.all(
              enabledMutationOperations.map(async mutationOperation =>
                schemaComposer.Mutation.addFields({
                  [`${modelConfig.name}_${mutationOperation}`]:
                    modelTC.getResolver(mutationOperation),
                }),
              ),
            ),
          ]);
          const typeName = modelTC.getTypeName();
          typeMergingOptions[typeName] = {
            selectionSet: `{ id }`,
            key: ({ id }) => id,
            argsFromKeys: ids => ({ ids }),
            fieldName: `${typeName}_dataLoaderMany`,
          };
        }) || [],
      ),
      Promise.all(
        this.config.discriminators?.map(async discriminatorConfig => {
          const discriminator = await loadFromModuleExportExpression<any>(
            discriminatorConfig.path,
            {
              defaultExportName: discriminatorConfig.name,
              cwd: this.baseDir,
              importFn: this.importFn,
            },
          );
          const discriminatorTC = composeWithMongooseDiscriminators(
            discriminator,
            discriminatorConfig.options as any,
          );
          await Promise.all([
            Promise.all(
              modelQueryOperations.map(async queryOperation =>
                schemaComposer.Query.addFields({
                  [`${discriminatorConfig.name}_${queryOperation}`]:
                    discriminatorTC.getResolver(queryOperation),
                }),
              ),
            ),
            Promise.all(
              modelMutationOperations.map(async mutationOperation =>
                schemaComposer.Mutation.addFields({
                  [`${discriminatorConfig.name}_${mutationOperation}`]:
                    discriminatorTC.getResolver(mutationOperation),
                }),
              ),
            ),
          ]);
          const typeName = discriminatorTC.getTypeName();
          typeMergingOptions[typeName] = {
            selectionSet: `{ id }`,
            key: ({ id }) => id,
            argsFromKeys: ids => ({ ids }),
            fieldName: `${typeName}_dataLoaderMany`,
          };
        }) || [],
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
