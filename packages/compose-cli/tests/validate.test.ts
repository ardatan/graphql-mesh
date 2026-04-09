import { parse } from 'graphql';
import type { ServiceDefinition } from '@theguild/federation-composition';
import { validateSupergraphSdl } from '../src/validate';

function makeSubgraph(name: string, sdl: string): ServiceDefinition {
  return { name, typeDefs: parse(sdl) };
}

describe('validateSupergraphSdl', () => {
  describe('@merge directive', () => {
    it('returns no errors for valid @merge directive', () => {
      const subgraph = makeSubgraph(
        'Products',
        /* GraphQL */ `
          type Query {
            product(id: ID!): Product
          }
          type Product {
            id: ID!
            name: String!
          }
        `,
      );
      const supergraphSdl = /* GraphQL */ `
        directive @merge(
          subgraph: String
        ) on OBJECT | INTERFACE | UNION | ENUM | SCALAR | INPUT_OBJECT
        type Product @merge(subgraph: "Products") {
          id: ID!
          name: String!
        }
        type Query {
          product(id: ID!): Product
        }
      `;
      const errors = validateSupergraphSdl(supergraphSdl, [subgraph]);
      expect(errors).toHaveLength(0);
    });

    it('returns error when @merge references unknown subgraph', () => {
      const subgraph = makeSubgraph(
        'Products',
        /* GraphQL */ `
          type Query {
            product(id: ID!): Product
          }
          type Product {
            id: ID!
          }
        `,
      );
      const supergraphSdl = /* GraphQL */ `
        directive @merge(
          subgraph: String
        ) on OBJECT | INTERFACE | UNION | ENUM | SCALAR | INPUT_OBJECT
        type Product @merge(subgraph: "UnknownSubgraph") {
          id: ID!
        }
        type Query {
          product(id: ID!): Product
        }
      `;
      const errors = validateSupergraphSdl(supergraphSdl, [subgraph]);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('references unknown subgraph UnknownSubgraph');
    });
  });

  describe('@resolveTo directive', () => {
    it('returns no errors for valid @resolveTo directive', () => {
      const subgraph = makeSubgraph(
        'Products',
        /* GraphQL */ `
          type Query {
            product(id: ID!): Product
          }
          type Product {
            id: ID!
            name: String!
          }
        `,
      );
      const supergraphSdl = /* GraphQL */ `
        directive @resolveTo(
          sourceName: String
          sourceTypeName: String
          sourceFieldName: String
        ) on OBJECT | INTERFACE | UNION | ENUM | SCALAR | INPUT_OBJECT
        type Product
          @resolveTo(sourceName: "Products", sourceTypeName: "Query", sourceFieldName: "product") {
          id: ID!
          name: String!
        }
        type Query {
          product(id: ID!): Product
        }
      `;
      const errors = validateSupergraphSdl(supergraphSdl, [subgraph]);
      expect(errors).toHaveLength(0);
    });

    it('returns error when @resolveTo references unknown subgraph', () => {
      const subgraph = makeSubgraph(
        'Products',
        /* GraphQL */ `
          type Query {
            product(id: ID!): Product
          }
          type Product {
            id: ID!
          }
        `,
      );
      const supergraphSdl = /* GraphQL */ `
        directive @resolveTo(
          sourceName: String
          sourceTypeName: String
          sourceFieldName: String
        ) on OBJECT | INTERFACE | UNION | ENUM | SCALAR | INPUT_OBJECT
        type Product
          @resolveTo(
            sourceName: "UnknownSubgraph"
            sourceTypeName: "Query"
            sourceFieldName: "product"
          ) {
          id: ID!
        }
        type Query {
          product(id: ID!): Product
        }
      `;
      const errors = validateSupergraphSdl(supergraphSdl, [subgraph]);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('references unknown subgraph UnknownSubgraph');
    });

    it('returns error when @resolveTo references unknown type in subgraph', () => {
      const subgraph = makeSubgraph(
        'Products',
        /* GraphQL */ `
          type Query {
            product(id: ID!): Product
          }
          type Product {
            id: ID!
          }
        `,
      );
      const supergraphSdl = /* GraphQL */ `
        directive @resolveTo(
          sourceName: String
          sourceTypeName: String
          sourceFieldName: String
        ) on OBJECT | INTERFACE | UNION | ENUM | SCALAR | INPUT_OBJECT
        type Product
          @resolveTo(
            sourceName: "Products"
            sourceTypeName: "NonExistentType"
            sourceFieldName: "product"
          ) {
          id: ID!
        }
        type Query {
          product(id: ID!): Product
        }
      `;
      const errors = validateSupergraphSdl(supergraphSdl, [subgraph]);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain(
        'references unknown type NonExistentType in subgraph Products',
      );
    });

    it('returns error with suggestion when @resolveTo references unknown field', () => {
      const subgraph = makeSubgraph(
        'Products',
        /* GraphQL */ `
          type Query {
            productById(id: ID!): Product
          }
          type Product {
            id: ID!
          }
        `,
      );
      const supergraphSdl = /* GraphQL */ `
        directive @resolveTo(
          sourceName: String
          sourceTypeName: String
          sourceFieldName: String
        ) on OBJECT | INTERFACE | UNION | ENUM | SCALAR | INPUT_OBJECT
        type Product
          @resolveTo(
            sourceName: "Products"
            sourceTypeName: "Query"
            sourceFieldName: "productByI"
          ) {
          id: ID!
        }
        type Query {
          productById(id: ID!): Product
        }
      `;
      const errors = validateSupergraphSdl(supergraphSdl, [subgraph]);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain(
        'references unknown field productByI in subgraph Products',
      );
      expect(errors[0].message).toContain('Did you mean "productById"');
    });

    it('returns error with suggestion when @resolveTo references unknown argument', () => {
      const subgraph = makeSubgraph(
        'Products',
        /* GraphQL */ `
          type Query {
            productById(productId: ID!): Product
          }
          type Product {
            id: ID!
          }
        `,
      );
      // sourceArgs must be typed as a custom scalar so it can hold an object value
      const supergraphSdl = /* GraphQL */ `
        scalar ResolveToSourceArgs
        directive @resolveTo(
          sourceName: String
          sourceTypeName: String
          sourceFieldName: String
          sourceArgs: ResolveToSourceArgs
        ) on OBJECT | INTERFACE | UNION | ENUM | SCALAR | INPUT_OBJECT
        type Product
          @resolveTo(
            sourceName: "Products"
            sourceTypeName: "Query"
            sourceFieldName: "productById"
            sourceArgs: { productI: "someValue" }
          ) {
          id: ID!
        }
        type Query {
          productById(productId: ID!): Product
        }
      `;
      const errors = validateSupergraphSdl(supergraphSdl, [subgraph]);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain(
        'references unknown argument productI in field productById of subgraph Products',
      );
      expect(errors[0].message).toContain('Did you mean "productId"');
    });

    it('returns no errors when @resolveTo sourceArgs match field arguments', () => {
      const subgraph = makeSubgraph(
        'Products',
        /* GraphQL */ `
          type Query {
            productById(productId: ID!): Product
          }
          type Product {
            id: ID!
          }
        `,
      );
      // sourceArgs must be typed as a custom scalar so it can hold an object value
      const supergraphSdl = /* GraphQL */ `
        scalar ResolveToSourceArgs
        directive @resolveTo(
          sourceName: String
          sourceTypeName: String
          sourceFieldName: String
          sourceArgs: ResolveToSourceArgs
        ) on OBJECT | INTERFACE | UNION | ENUM | SCALAR | INPUT_OBJECT
        type Product
          @resolveTo(
            sourceName: "Products"
            sourceTypeName: "Query"
            sourceFieldName: "productById"
            sourceArgs: { productId: "someValue" }
          ) {
          id: ID!
        }
        type Query {
          productById(productId: ID!): Product
        }
      `;
      const errors = validateSupergraphSdl(supergraphSdl, [subgraph]);
      expect(errors).toHaveLength(0);
    });
  });
});
