---
'@graphql-mesh/utils': minor
---

Trimming log messages is an option independant of the DEBUG environment variable.

Instead of trimming messages at 100 characters by default when the `DEBUG` environment variable is falsy, have the user configure the trim length that is not set by default.

```js
import { DefaultLogger } from '@graphql-mesh/utils';
const trimmedLogger = new DefaultLogger('my-logger', undefined, 100 /* trim at 100 characters*/);
``
