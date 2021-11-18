---
id: mock
title: Mock Transform
sidebar_label: Mock
---

The `mock` transform allow you to apply mocking for development usage.

To get started with this transform, install it from npm:

```
yarn add @graphql-mesh/transform-mock
```

## How to use?

Add the following configuration to your Mesh config file:

```yml
transforms:
  - mock:
      mocks:
        - apply: User.firstName
          faker: '{{name.firstName}}'
```

The example above will replace the resolver of `User.firstName` with a mock that uses `faker.js` to generate a random name.


## Custom mock functions for fields

You can mock a specific field of a type;

```yml
transforms:
  - mock:
      mocks: 
        - apply: User.fullName
          custom: ./user-mocks#fullName
```

## Custom mock functions for types

You can mock types with custom mock functions like below;

```yml
transforms:
  - mock:
      mocks:
        - apply: DateTime
          custom: graphql-scalars#DateTimeMock 
          # This will import `DateTimeMock` from `graphql-scalars` for example. Local paths are also supported
```

in `user-mocks.js` file;

```js
module.exports = {
  fullName: () => 'My Static Name'
};
```
When defined manually, properties can return values either directly, or through a method. This is useful when defining static mocks, because a mock property will be called as many times as there are items, for example in an array.
Here's an example on how this could be achieved:

in `user-mocks.js` file;
```js
function* generateNames() {
  while (true) {
    yield "John Doe";
    yield "John Snow";
  }
}

const fullNames = generateNames();

export const fullName = () => fullNames.next().value;
```
and in case you are using [typescript](https://graphql-mesh.com/docs/recipes/typescript) in `user-mocks.ts` file:
```ts
import { User } from './types/mesh';

function* generateNames(): Generator<string> {
  while (true) {
    yield "John Doe";
    yield "John Snow";
  }
}

const fullNames = generateNames();

export const fullName: () => User['fullName'] = () => fullNames.next().value;
```

## Mocking the lists

By default, Mesh generates two mocked items if the return type is a list. But this can be configured;

Let's say, you have a schema like below;

```graphql
  type Query {
    users: [User]
  }
  type User {
    id: ID
    fullName: String
  }
```

Then a configuration like below;

```yml
transforms:
  - mock:
      mocks: 
        - apply: User.fullName
          faker: '{{name.fullName}}'
        - apply: Query.users
          length: 3
```

Now `{ users { id fullName } }` query will return 3 of `User` item;

```json
{
  "users": [
    {
      "id": "SOME_RANDOM_ID",
      "fullName": "John Doe"
    },    
    {
      "id": "SOME_RANDOM_ID",
      "fullName": "Jane Doe"
    },
    {
      "id": "SOME_RANDOM_ID",
      "fullName": "The Other Doe"
    }
  ]
}
```

## Stateful mocking

GraphQL Mesh supports GraphQL Tools's Stateful Mocking feature. So you can have stateful mocking by using the store provided in the context `context.mockStore`;

### Initialize store
When having a schema that returns a list, in this case a list of users:
```graphql
type User {
  id: ID
  name: String
}
type Query {
  users: User
}
```
Initially populating the list of users can be done by utilizing the `initializeStore` property. The store initialization will happen before the store is attached to the schema.

In this case there is no need to provide special array mocking definition, like `length`. It will automatically be taken based on the mock data.


```yml
transforms:
  - mock:
      initializeStore: ./myMock#initializeStore
```

In the `./myMock.js`:
```ts
const users = [{id: 'uuid', name: 'John Snow'}]

export default {
  initializeStore: (store) => {
    // Set individual users data in the store so that they can be queried as individuals later on
    users.forEach((user) => {
      store.set('User', user.id, user);
    });

    // Populate the `users` query on the root with data
    store.set('Query', 'ROOT', 'users', users);
  },
};
```

### Get from the store
You can implement the mock query field `*ById` declaratively like below:

```graphql
type Query {
  user(id:ID): User
}
```

```yml
transforms:
  - mock:
      initializeStore: absolute-path-to-file/myMock#initializeStore
      mocks: 
        - apply: Query.user
          store:
            type: User
            key: "{args.id}" 
```

### Mutate data in the store

```graphql
type User {
  id: ID
  name: String
}
type Query {
  me: User
}
type Mutation {
  changeMyName(newName: String): User
  updateUser(id: ID, name: String): User
}
```

```yml
transforms:
  - mock:
      mocks: 
        - apply: Mutation.changeMyName
          custom: ./myMocks#changeMyName
          
        - apply: Mutation.addUser
          updateStore:
            type: User
            key: "{random}"
            fieldName: name
            value: "{args.name}"
            
          # return created user
          store:
            type: User
            key: "{random}"
            
        - apply: Mutation.updateUser
          custom: ./mocks#updateUser
          
          # or you can do the following
          updateStore:
            type: User
            key: "{args.id}"
            fieldName: name
            value: "{args.name}"
          # return updated user
          store: 
            type: User
            key: "{args.id}"
```

In the code:
```js
module.exports = {
  changeMyName: (_, { newName }, { mockStore }) => {
    mockStore.set('Query', 'ROOT', 'me', { name: newName });
    return mockStore.get('Query', 'ROOT', 'me');
  },
  updateUser: (_, { id, name }, { mockStore }) => {
    mockStore.set('User', id, { name });
    return mockStore.get('User', id);
  }
}
```




> Learn more about GraphQL Tools Mocking https://graphql-tools.com/docs/mocking

## Codesandbox Example

You can check out our example that uses JSON Schema handler with mock data.

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/json-schema-example?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="json-schema-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>

## Config API Reference

{@import ../generated-markdown/MockingConfig.generated.md}
