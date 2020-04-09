import { composeWithMongoose, composeWithMongooseDiscriminators } from 'graphql-compose-mongoose';
import { SchemaComposer, ObjMap, ObjectTypeComposerFieldConfigDefinition } from 'graphql-compose';
import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { camelCase } from 'change-case';
import { ArgsMap } from 'graphql-compose/lib/ObjectTypeComposer';
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

const handler: MeshHandlerLibrary<YamlConfig.MongooseHandler> = {
  async getMeshSource({ config, hooks }) {
    const schemaComposer = new SchemaComposer();

    if (config.connectionString) {
      await mongoose.connect(config.connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }

    const queryFields: ObjMap<ObjectTypeComposerFieldConfigDefinition<any, any, ArgsMap>> = {};
    const mutationFields: ObjMap<ObjectTypeComposerFieldConfigDefinition<any, any, ArgsMap>> = {};

    if (config.models) {
      await Promise.all(
        config.models.map(async modelConfig => {
          const model = await loadFromModuleExportExpression(modelConfig.path, modelConfig.name);
          const modelTC = composeWithMongoose(model, modelConfig.options as any);
          for (const queryOperation of modelQueryOperations) {
            queryFields[camelCase(`${modelConfig.name}_${queryOperation}`)] = modelTC.getResolver(queryOperation);
          }
          for (const mutationOperation of modelMutationOperations) {
            mutationFields[camelCase(`${modelConfig.name}_${mutationOperation}`)] = modelTC.getResolver(
              mutationOperation
            );
          }
        })
      );
    }

    if (config.discriminators) {
      await Promise.all(
        config.discriminators.map(async discriminatorConfig => {
          const discriminator = await loadFromModuleExportExpression(
            discriminatorConfig.path,
            discriminatorConfig.name
          );
          const discriminatorTC = composeWithMongooseDiscriminators(discriminator, discriminatorConfig.options as any);
          for (const queryOperation of modelQueryOperations) {
            queryFields[camelCase(`${discriminatorConfig.name}_${queryOperation}`)] = discriminatorTC.getResolver(
              queryOperation
            );
          }
          for (const mutationOperation of modelMutationOperations) {
            mutationFields[camelCase(`${discriminatorConfig.name}_${mutationOperation}`)] = discriminatorTC.getResolver(
              mutationOperation
            );
          }
        })
      );
    }
    schemaComposer.Query.addFields(queryFields);
    schemaComposer.Mutation.addFields(mutationFields);

    const schema = schemaComposer.buildSchema();

    hooks.on('destroy', () => mongoose.disconnect());

    return {
      schema,
    };
  },
};

export default handler;
