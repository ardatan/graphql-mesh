---
'@graphql-mesh/cache-redis': patch
---

Support REDIS_FAMILY to set family of the IP address (IPv4 or IPv6).

This enhancement allows you to explicitly specify the IP address family when connecting to Redis instances:
- 4: Force IPv4
- 6: Force IPv6
- 0: Automatic (default)

This is particularly useful in network environments where specific IP protocols are required or when troubleshooting connection issues.
