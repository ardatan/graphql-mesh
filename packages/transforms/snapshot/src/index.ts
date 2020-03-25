import { GraphQLSchema } from "graphql";
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { extractResolversFromSchema, composeResolvers, ResolversComposerMapping, ResolversComposition } from '@graphql-toolkit/common';
import { addResolveFunctionsToSchema } from 'graphql-tools-fork';
import { isAbsolute, join } from 'path';
import { existsSync, readFileSync, writeFileSync } from "fs";
import { ensureFileSync } from 'fs-extra';
import md5 from 'md5';

const snapshotTransform: TransformFn<YamlConfig.SnapshotTransformConfig> = async ({
    schema,
    config
  }): Promise<GraphQLSchema> => {

    const configIf = 'if' in config ? typeof config.if === 'boolean' ? config.if : eval(config.if) : true;

    if(configIf) {
        const resolvers = extractResolversFromSchema(schema);
        const resolversComposition: ResolversComposerMapping = {};
    
        const outputDir = isAbsolute(config.outputDir) ? config.outputDir : join(process.cwd(), config.outputDir);
    
        const snapshotComposition: ResolversComposition = next => async (root, args, context, info) => {
            const fileName = [info.parentType.name, info.fieldName, md5(JSON.stringify(args))].join('_') + '.json';
            const snapshotFilePath = join(outputDir, fileName);
            if (existsSync(snapshotFilePath)) {
                return JSON.parse(readFileSync(snapshotFilePath, 'utf8'));
            }
            const result = await next(root, args, context, info);
            ensureFileSync(snapshotFilePath);
            writeFileSync(snapshotFilePath, JSON.stringify(result, null, 2));
            return result;
        };
    
        for (const field of config.apply) {
            resolversComposition[field] = snapshotComposition;
        }
    
        const composedResolvers = composeResolvers(resolvers, resolversComposition);
        addResolveFunctionsToSchema({
            schema,
            resolvers: composedResolvers,
        });
    
    }
    
    return schema;
  };


export default snapshotTransform;