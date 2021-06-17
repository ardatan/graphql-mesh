---
id: localforage
title: LocalForage
sidebar_label: LocalForage
---

LocalForage is a library that improves the existing storage mechanism in the browser by using `IndexedDB`, `WebSQL` and `localStorage`. [See more](https://github.com/localForage/localForage) 

This caching mechanism is only recommended for the browser environments. [See the example](https://github.com/Urigo/graphql-mesh/blob/master/examples/openapi-react-weatherbit/src/mesh/useMeshSdk.ts#L10)

To get started with this caching strategy, install it from npm:

```
yarn add @graphql-mesh/cache-localforage
```

## How to use?

```yml
cache:
  localforage:
    driver: [WEBSQL, INDEXEDDB, LOCALSTORAGE] # LocalForage will try these methods in order and get the first compatible option
```

## Config API Reference

{@import ../generated-markdown/LocalforageConfig.generated.md}
