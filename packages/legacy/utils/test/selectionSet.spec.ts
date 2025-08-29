import { parse, print } from 'graphql';
import { parseSelectionSet } from '@graphql-tools/utils';
import { differenceSelectionSets } from '../src/diffSelectionSets';
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

it.each([
  // Basic field differences
  {
    required: '{ id, name, email }',
    available: '{ id, name }',
    missing: '{ email }',
  },

  // No difference - identical sets
  {
    required: '{ id, name }',
    available: '{ id, name }',
    missing: null,
  },

  // Nested field differences
  {
    required: '{ user { id, name, email }, posts }',
    available: '{ user { id, name } }',
    missing: '{ user { email }, posts }',
  },

  // Field with alias differences
  {
    required: '{ id, userName: name, email }',
    available: '{ id, userName: name }',
    missing: '{ email }',
  },

  // Deep nesting differences
  {
    required: '{ user { profile { avatar, bio, settings { theme } } } }',
    available: '{ user { profile { avatar, bio } } }',
    missing: '{ user { profile { settings { theme } } } }',
  },

  // Inline fragment differences
  {
    required: '{ id, ... on User { name, email } }',
    available: '{ id, ... on User { name } }',
    missing: '{ ... on User { email } }',
  },

  // Fragment spread differences
  {
    required: '{ id, ...UserFragment, ...PostFragment }',
    available: '{ id, ...UserFragment }',
    missing: '{ ...PostFragment }',
  },

  // Mixed selection types
  {
    required: '{ id, name, ... on Admin { role } }',
    available: '{ id }',
    missing: '{ name, ... on Admin { role } }',
  },

  // Different inline fragment type conditions
  {
    required: '{ id, ... on User { name }, ... on Admin { role } }',
    available: '{ id, ... on User { name } }',
    missing: '{ ... on Admin { role } }',
  },

  // Complete subtraction - required is subset of available
  {
    required: '{ id, name }',
    available: '{ id, name, email, posts { title } }',
    missing: null,
  },

  // Field exists in required with selectionSet, available without
  {
    required: '{ user { id, name } }',
    available: '{ user }',
    missing: '{ user { id, name } }',
  },

  // Field exists in required without selectionSet, available with
  {
    required: '{ user }',
    available: '{ user { id, name } }',
    missing: null,
  },

  // Complex nested with multiple levels
  {
    required: '{ user { posts { id, title, comments { author, text } }, profile { bio } } }',
    available: '{ user { posts { id, title }, profile { bio } } }',
    missing: '{ user { posts { comments { author, text } } } }',
  },

  // Different fragment spreads
  {
    required: '{ ...FragmentA, ...FragmentB }',
    available: '{ ...FragmentA, ...FragmentC }',
    missing: '{ ...FragmentB }',
  },

  // Empty available
  {
    required: '{ id, name, email }',
    available: null,
    missing: '{ id, name, email }',
  },
])(
  'should calculate that $required - $available = $missing',
  ({ required, available, missing }) => {
    let diff = differenceSelectionSets(
      required ? parseSelectionSet(required) : null,
      available ? parseSelectionSet(available) : null,
    );
    if (!missing) {
      expect(diff).toEqual(missing);
    } else {
      expect(print(diff)).toEqual(
        // print->parse stabilises the AST for comparison
        print(parse(missing)),
      );
    }
  },
);
