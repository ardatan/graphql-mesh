import { writeFileSync } from 'fs';
import { GraphQLSchema } from 'graphql';

export async function generateResolversFile(
  schema: GraphQLSchema,
  outFile: string,
  apiName: string,
): Promise<any> {
  let output = `export const resolvers = {}`;

  writeFileSync(outFile, output);
}
