import { print } from 'graphql';
import { Resolvers } from './.mesh';

export const resolvers: Resolvers = {
  Query: {
    user(root, args, context, info) {
      return context.ExampleAPI.Mutation.usersByIds({
        root,
        context,
        info,
        // Key for the following batched request
        key: args.id,
        // Arguments for the following batched request
        argsFromKeys: ids => ({ input: { ids } }),
        // Function to extract the result from the batched response
        valuesFromResults: data => data.results,
        // Function to generate the selectionSet for the batched request
        selectionSet: userSelectionSet => /* GraphQL */ `
          {
            results ${print(userSelectionSet)} # Will print something like { id name }
          }
        `,
      });
    },
  },
};
