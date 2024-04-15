export const resolvers = {
  User: {
    __resolveReference(object, context) {
      return {
        ...object,
        ...users.find(user => user.id === object.id),
      };
    },
  },
  Query: {
    me(_root, _args, context) {
      return users[0];
    },
    users(_root, _args, context) {
      return users;
    },
    user(_root, args, context) {
      return users.find(user => user.id === args.id);
    },
  },
};

const users = [
  {
    id: '1',
    name: 'Ada Lovelace',
    birthDate: '1815-12-10',
    username: '@ada',
  },
  {
    id: '2',
    name: 'Alan Turing',
    birthDate: '1912-06-23',
    username: '@complete',
  },
];
