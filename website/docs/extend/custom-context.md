---
id: custom-context
title: Custom Context
sidebar_label: Custom Context
---


```ts
import { getMeshSdk, getBuiltMesh } from './.mesh';

async function test() {
  // Add customo context
  const { addCustomContextBuilder } = await getBuiltMesh();

  addCustomContextBuilder(async () => {
    const accessToken = localStorage.getItem('jwtToken');
    return {
      accessToken
    };
  });

  // Load mesh config and get the sdkClient from it
  const sdk = await getMeshSdk();

  // Execute `myQuery` and get a type-safe result
  // Variables and result are typed: { getSomething: { fieldA: string, fieldB: number }, errors?: GraphQLError[] }
  const { getSomething } = await sdk.myQuery({ someVar: 'foo' });
}
