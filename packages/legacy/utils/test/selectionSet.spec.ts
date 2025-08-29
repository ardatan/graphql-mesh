import { print } from 'graphql';
import { parseSelectionSet } from '@graphql-tools/utils';
import { containsSelectionSet, selectionSetOfData } from '../src/selectionSet';

it.each([
  {
    requiredSelSet: `{ id }`,
    selSet: `{ id }`,
    result: true,
  },
  {
    requiredSelSet: `{ id name }`,
    selSet: `{ id }`,
    result: false,
  },
  {
    requiredSelSet: `{ id }`,
    selSet: `{ id name }`,
    result: true,
  },
  {
    requiredSelSet: `{ id person { first last } }`,
    selSet: `{ id person }`,
    result: false,
  },
  {
    requiredSelSet: `{ id person }`,
    selSet: `{ id person { first last } }`,
    result: false,
  },
  {
    requiredSelSet: `{ id person { first } }`,
    selSet: `{ id person { first last } }`,
    result: true,
  },
  {
    requiredSelSet: `{ id person { first last } }`,
    selSet: `{ id person { last } }`,
    result: false,
  },
  {
    requiredSelSet: `{ id person { last friend { first } } }`,
    selSet: `{ id person { last } }`,
    result: false,
  },
  {
    requiredSelSet: `{ id person { last friend { first } } }`,
    selSet: `{ id person { last friend } }`,
    result: false,
  },
  {
    requiredSelSet: `{ id person { last friend { first } } }`,
    selSet: `{ id person { last friend { first } } }`,
    result: true,
  },
  {
    requiredSelSet: `{ ... on Person { first last } }`,
    selSet: `{ ... on Person { first last } }`,
    result: true,
  },
  {
    requiredSelSet: `{ ... on Person { first } }`,
    selSet: `{ ... on Animal { first } }`,
    result: false,
  },
  // TODO: fragment defs and spreads
  // TODO: inline fragments without type conditions can be flattened
  // {
  //   requiredSelSet: `{ ... { id name } }`,
  //   selSet: `{ id name }`,
  //   result: true,
  // },
  // {
  //   requiredSelSet: `{ id name }`,
  //   selSet: `{ ... { id name } }`,
  //   result: true,
  // },
  // TODO: merged selection should satisfy requirement
  // {
  //   requiredSelSet: `{ user { a b } }`,
  //   selSet: `{ user { a } user { b } }`,
  //   result: true,
  // },
  // {
  //   requiredSelSet: `{ ... { user { a b } } }`,
  //   selSet: `{ user { a } user { b } }`,
  //   result: true,
  // },
])(
  'should return $result when searching for $requiredSelSet in $selSet',
  ({ selSet, requiredSelSet, result }) => {
    expect(containsSelectionSet(parseSelectionSet(requiredSelSet), parseSelectionSet(selSet))).toBe(
      result,
    );
  },
);

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
