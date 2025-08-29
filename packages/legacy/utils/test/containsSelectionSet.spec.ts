import { parseSelectionSet } from '@graphql-tools/utils';
import { containsSelectionSet } from '../src/containsSelectionSet';

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
])(
  'should return $result when searching for $requiredSelSet in $selSet',
  ({ selSet, requiredSelSet, result }) => {
    expect(containsSelectionSet(parseSelectionSet(requiredSelSet), parseSelectionSet(selSet))).toBe(
      result,
    );
  },
);
