export const resolvers = {
  Query: {
    demoMe: () => ({
      role: 'USER',
      spaceId: 'demo_space',
      userId: 'demo_user',
    }),
    demoFeatures: () => ({
      edges: [
        {
          node: {
            id: 'demo',
            name: 'Demo_feature',
            description: 'Demo_feature_description',
            publicId: 'demo_public_id',
          },
        },
      ],
    }),
  },
};
