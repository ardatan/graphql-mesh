export const resolvers = {
  Author: {
    __resolveReference(author: { id: string }) {
      return authors.find(a => a.id === author.id);
    },
  },
  Query: {
    author(_: any, { id }: { id: string }) {
      return authors.find(a => a.id === id);
    },
    authors() {
      return authors;
    },
  },
};

const authors = [
  {
    id: '1',
    name: 'Jane Doe',
  },
  {
    id: '2',
    name: 'John Doe',
  },
];
