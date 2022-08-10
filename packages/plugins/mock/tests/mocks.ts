import { MockStore } from '@graphql-tools/mock';

export const id = 'sample-id';
export const fullName = 'John Snow';
export const GetUserMock = (_: never, { id }: { id: string }, { mockStore }: { mockStore: MockStore }) =>
  mockStore.get('User', id);
export const AddUserMock = (_: never, { name }: { name: string }, { mockStore }: { mockStore: MockStore }) => {
  const newUserId = Date.now().toString();
  mockStore.set('User', newUserId, 'name', name);
  return mockStore.get('User', newUserId);
};
export const UpdateUserMock = (
  _: never,
  { id, name }: { id: string; name: string },
  { mockStore }: { mockStore: MockStore }
) => {
  mockStore.set('User', id, { name });
  return mockStore.get('User', id);
};
