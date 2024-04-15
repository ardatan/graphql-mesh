export const exampleQueries = {
  me: /* GraphQL */ `
    query me {
      demoMe {
        role
        spaceId
        userId
      }
      demoFeatures {
        edges {
          node {
            description
            id
            name
            publicId
          }
        }
      }
    }
  `,
};
