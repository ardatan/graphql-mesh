/* eslint-disable @typescript-eslint/naming-convention */
import type { Resolvers, MeshContext } from '../../.mesh';

const resolvers: Resolvers = {
  NewPetResponseUnion: {
    __resolveType: (val: any) => {
      return (val as any).foo
        ? 'NewPetResponse'
        : 'Error';
    },
  },
  Query: {
    newPet: async (root, args, context: MeshContext, info): Promise<any> => {
      const {
        petId,
        extraId
      } = args;

      const data = (await context.Swapi.Query.pet_by_petId({
        root,
        args: {
          petId
        },
        context,
        info,
      })) as any;

      console.log('Data from pet_by_petId', JSON.stringify(data, null, 4));

      return {
        foo: JSON.stringify(data)
      };
    },
  },
};

export default resolvers;
