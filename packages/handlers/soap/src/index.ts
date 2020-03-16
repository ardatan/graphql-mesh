import { MeshHandlerLibrary } from '@graphql-mesh/types';
import { soapGraphqlSchema } from 'soap-graphql';

const handler: MeshHandlerLibrary<{}> = {
    async getMeshSource({
        filePathOrUrl,
        name,
        config
    }) {
        const schema = await soapGraphqlSchema(filePathOrUrl);
        return {
            schema,
            source: filePathOrUrl,
            name,
        };
    }
}

export default handler;