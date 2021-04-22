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

## Custom mock functions for fields

You can mock a specific field of a type;

```yml
transforms:
  - mock:
      mocks: 
        - apply: User.fullName
          custom: ./user-mocks#fullName
```

in `user-mocks.js` file;

```js
module.exports = {
  fullName: () => 'My Static Name'
};
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
}
```

```yml
transforms:
  - mock:
      mocks: 
        - apply: Mutation.changeMyName
          custom: ./myMocks#changeMyName
```

In the code part;

```js
module.exports = {
  changeMyName: (_, { newName }, { mockStore }) => {
    mockStore.set('Query', 'ROOT', 'me', { name: newName });
    return mockStore.get('Query', 'ROOT', 'me');
  } 
}
```

You can also implement `*ById` field declaratively like below;

```graphql
type Query {
  user(id:ID) : User
}
```

```yml
transforms:
  - mock:
      mocks: 
        - apply: Query.user
          store:
            type: User
            key: "{args.id}" 
```

> Learn more about GraphQL Tools Mocking; https://www.graphql-tools.com/docs/mocking

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
