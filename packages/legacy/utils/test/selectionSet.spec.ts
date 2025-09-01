import { print } from 'graphql';
import { selectionSetOfData } from '../src/selectionSet';

it('should create the correct selection set of data', () => {
  const data = {
    name: 'john',
    surname: 'doe',
    bestFriend: {
      friends: [
        {
          surname: 'sabrina',
        },
      ],
      name: 'jane',
    },
    friends: [
      {
        name: 'paul',
      },
    ],
  };

  const selSet = selectionSetOfData(data);
  expect(print(selSet)).toMatchInlineSnapshot(`
"{
  name
  surname
  bestFriend {
    friends {
      surname
    }
    name
  }
  friends {
    name
  }
}"
`);
});
