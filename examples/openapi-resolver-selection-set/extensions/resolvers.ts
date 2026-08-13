export default {
  Query: {
    newPet: async (_root: unknown, args: { petId: string }, context: any, info: unknown) => {
      // Without selectionSet, Mesh only forwards fields from the outer query
      // (NewPetResponse.foo), so the nested Pet call would only receive __typename.
      const data = await context.Pets.Query.pet_by_petId({
        root: _root,
        args: {
          petId: args.petId,
        },
        context,
        info,
        selectionSet: /* GraphQL */ `
          {
            id
            name
          }
        `,
      });

      return {
        foo: JSON.stringify(data),
      };
    },
  },
};
