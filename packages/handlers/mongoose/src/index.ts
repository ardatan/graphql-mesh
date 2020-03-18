import { composeWithMongoose, composeWithMongooseDiscriminators } from 'graphql-compose-mongoose';
import { schemaComposer, ObjMap, ObjectTypeComposerFieldConfigDefinition } from 'graphql-compose';
import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { camelCase } from 'change-case';
import { ArgsMap } from 'graphql-compose/lib/ObjectTypeComposer';
import mongoose from 'mongoose';
import { isAbsolute, join } from 'path';
import { printSchema } from 'graphql';

const modelQueryOperations = [
    'findById',
    'findByIds',
    'findOne',
    'findMany',
    'count',
    'connection',
    'pagination'
];

const modelMutationOperations = [
    'createOne',
    'createMany',
    'updateById',
    'updateOne',
    'updateMany',
    'removeById',
    'removeOne',
    'removeMany'
];

async function loadExternalModuleByExpression(expression: string, defaultExportName?: string) {
    const [modulePath, exportName = defaultExportName] = expression.split('#');
    const absoluteModulePath = isAbsolute(modulePath) ? modulePath : join(process.cwd(), modulePath);
    const mod = await import(absoluteModulePath);
    return (exportName && mod[exportName]) || mod.default || mod;
}

const handler: MeshHandlerLibrary<YamlConfig.MongooseHandler> = {
    async getMeshSource({
        handler,
    }) {
        if (handler.source) {
            await mongoose.connect(handler.source, { useNewUrlParser: true, useUnifiedTopology: true });
        }
        const queryFields: ObjMap<ObjectTypeComposerFieldConfigDefinition<any, any, ArgsMap>> = {};
        const mutationFields: ObjMap<ObjectTypeComposerFieldConfigDefinition<any, any, ArgsMap>> = {};
        if (handler.config?.models) {
            await Promise.all(handler.config?.models.map(async modelConfig => {
                const model = await loadExternalModuleByExpression(modelConfig.path, modelConfig.name);
                const modelTC = composeWithMongoose(model, modelConfig.options as any);
                for (const queryOperation of modelQueryOperations) {
                    queryFields[camelCase(`${modelConfig.name}_${queryOperation}`)] = modelTC.getResolver(queryOperation);
                }
                for (const mutationOperation of modelMutationOperations) {
                    mutationFields[camelCase(`${modelConfig.name}_${mutationOperation}`)] = modelTC.getResolver(mutationOperation);
                }
            }))
        }
        if (handler.config?.discriminators) {
            await Promise.all(handler.config?.discriminators.map(async discriminatorConfig => {
                const discriminator = await loadExternalModuleByExpression(discriminatorConfig.path, discriminatorConfig.name);
                const discriminatorTC = composeWithMongooseDiscriminators(discriminator, discriminatorConfig.options as any);
                for (const queryOperation of modelQueryOperations) {
                    queryFields[camelCase(`${discriminatorConfig.name}_${queryOperation}`)] = discriminatorTC.getResolver(queryOperation);
                }
                for (const mutationOperation of modelMutationOperations) {
                    mutationFields[camelCase(`${discriminatorConfig.name}_${mutationOperation}`)] = discriminatorTC.getResolver(mutationOperation);
                }
            }))
        }
        schemaComposer.Query.addFields(queryFields);
        schemaComposer.Mutation.addFields(mutationFields);
        const schema = schemaComposer.buildSchema();
        return {
            schema,
        }
    }
};

export default handler;
