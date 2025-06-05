import { describe, expect, it } from '@jest/globals';
import { getJSONSchemaOptionsFromMultipleOpenAPIOptions } from '../src/getJSONSchemaOptionsFromOpenAPIOptions.js';

describe('HATEOAS Cross-Schema Resolution', () => {
  // Helper function to create schemas with cross-references
  const createCrossReferencingSchemas = () => {
    const userSchema = {
      openapi: '3.0.0',
      info: { title: 'User API', version: '1.0.0' },
      paths: {
        '/users/{id}': {
          get: {
            operationId: 'getUser',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: {
              '200': {
                description: 'User data',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      title: 'User',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        _links: {
                          type: 'object',
                          properties: {
                            orders: {
                              type: 'object',
                              properties: {
                                href: { type: 'string' },
                              },
                            },
                          },
                          'x-links': [
                            {
                              rel: 'orders',
                              href: '/orders?userId={id}',
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as any;

    const orderSchema = {
      openapi: '3.0.0',
      info: { title: 'Order API', version: '1.0.0' },
      paths: {
        '/orders': {
          get: {
            operationId: 'getOrders',
            parameters: [
              {
                name: 'userId',
                in: 'query',
                schema: { type: 'string' },
              },
            ],
            responses: {
              '200': {
                description: 'Orders list',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      title: 'Orders',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          userId: { type: 'string' },
                          amount: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as any;

    return { userSchema, orderSchema };
  };

  it('should load schemas successfully regardless of order using batch loading', async () => {
    const { userSchema, orderSchema } = createCrossReferencingSchemas();

    // Test multiple orders to ensure batch loading works regardless of schema order
    const testOrders = [
      // Order 1: Users first, then Orders
      [
        { name: 'users', options: { source: userSchema, HATEOAS: true } },
        { name: 'orders', options: { source: orderSchema, HATEOAS: true } },
      ],
      // Order 2: Orders first, then Users
      [
        { name: 'orders', options: { source: orderSchema, HATEOAS: true } },
        { name: 'users', options: { source: userSchema, HATEOAS: true } },
      ],
    ];

    for (const schemas of testOrders) {
      const results = await getJSONSchemaOptionsFromMultipleOpenAPIOptions(schemas);

      // Both schemas should load successfully regardless of order
      expect(results).toHaveLength(2);
      expect(results.find(r => r.name === 'users')?.result.operations).toBeDefined();
      expect(results.find(r => r.name === 'orders')?.result.operations).toBeDefined();

      // Each schema should have its operation defined correctly
      const userOps = results.find(r => r.name === 'users')?.result.operations;
      const orderOps = results.find(r => r.name === 'orders')?.result.operations;

      expect(userOps).toHaveLength(1);
      expect(userOps[0].field).toBe('getUser');
      expect(orderOps).toHaveLength(1);
      expect(orderOps[0].field).toBe('getOrders');

      // The key improvement: batch loading completes without timeout issues
      // This demonstrates that our context-aware approach resolves the ordering dependency
    }
  });

  it('should handle backward compatibility with single schema loading', async () => {
    const { orderSchema } = createCrossReferencingSchemas();

    // Single schema loading should work as before
    const results = await getJSONSchemaOptionsFromMultipleOpenAPIOptions([
      { name: 'orders', options: { source: orderSchema, HATEOAS: true } },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('orders');
    expect(results[0].result.operations).toBeDefined();
    expect(results[0].result.operations[0].field).toBe('getOrders');
  });
});
