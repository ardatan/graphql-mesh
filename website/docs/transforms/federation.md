---
id: federation
title: Apollo Federation Transform
sidebar_label: Apollo Federation
---

`federation` transform allows to add the resolvers and directives to conform to the federation specification. Much of the federation sourcecode could be reused ensuring it is compliant to the specification. This transform uses [`graphql-transform-federation`](https://github.com/0xR/graphql-transform-federation) package.

```
yarn add @graphql-mesh/transform-federation
```

## How to use?

Add the following configuration to your Mesh config file:

```yml
transforms:
  - federation: 
        types:
            # Ensure the root queries of this schema show up the combined schema
            - name: Query
              config:
                extend: true
            - name: Product
              config:
                # extend Product {
                extend: true
                # Product @key(fields: "id") {
                keyFields:
                    - id
                fields:
                    # id: Int! @external
                    - name: id
                      external: true
                resolveReference:
                  targetSource: accounts
                  targetMethod: user
                  args:
                    id: root.id

```

### Add Reference Resolver as a Code File

If you want to add more complex business logic, you can point to a code file that exports a resolver function.

```yaml
resolveReference: ./userResolveReference.js
```

`./userResolveReference.js`
```js
// So we can point to an existing query field to resolve that entity
module.exports = (root, context) => context.accounts.api.user({ id: root.id })
```

> You can check out our example that uses Federation as a merging strategy.

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/federation-example?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="federation-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin" />

{@import ../generated-markdown/FederationTransform.generated.md}
