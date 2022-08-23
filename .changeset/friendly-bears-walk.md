---
"@graphql-mesh/cli": minor
"@graphql-mesh/utils": minor
---

Now CLI reports critical errors with stack traces even if DEBUG isn't enabled, and error messages are no longer trimmed.

```diff
Schema couldn't be generated because of the following errors:
- - Foo bar is n...
+ - Foo bar is not valid
+ at /somepath/somejsfile.js:123:2
+ at /someotherpath/someotherjs.file:232:4
```
