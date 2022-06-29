---
"@graphql-mesh/cache-redis": patch
---

fix(redis): add missing string interpolation for URL parameter

```
cache:
  redis:
    url: '{env.REDIS_DSN}'
```

This wasn't working before and user gets a random parse error.
