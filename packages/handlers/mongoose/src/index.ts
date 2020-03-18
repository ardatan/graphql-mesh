import { composeWithMongoose, composeWithMongooseDiscriminators } from 'graphql-compose-mongoose';
import { MeshHandlerLibrary } from '@graphql-mesh/types';
import { buildASTSchema } from 'graphql';

const handler: MeshHandlerLibrary<{}> = {
    async getMeshSource({
        name,
        config,
    }) {
        return {
            name,
            source: name,
            schema: buildASTSchema({} as any),
        }
    }
};