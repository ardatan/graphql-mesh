---
id: cache-redis
title: Redis Cache
sidebar_label: Redis
---

This caching strategy will use your Redis instance as the storage.

To get started with this caching strategy, install it from npm:

```
yarn add @graphql-mesh/cache-redis
```

## How to use?

```yml
cache:
    redis:
        host: localhost
        port: 9876
        password: MY_SECRET_PASSWORD
```

## Config API Reference

{@import ../generated-markdown/RedisConfig.generated.md}
