import { buildSchema, Kind, parse, type GraphQLResolveInfo } from 'graphql';
import { finalizeGatewayRequest } from '../src/finalizeGatewayRequest.js';

const schema = buildSchema(`
  type Query {
    product: Product
  }
  type Product {
    id: ID!
    name: String
  }
`);

function infoWithVars(variableValues: Record<string, unknown>): GraphQLResolveInfo {
  return {
    schema,
    variableValues,
  } as any;
}

describe('finalizeGatewayRequest @defer(if:)', () => {
  it('keeps selections under @defer(if: false) when defer is not forwarded', () => {
    const document = parse(`
      query ($deferIt: Boolean!) {
        product {
          id
          ... @defer(if: $deferIt) {
            name
          }
        }
      }
    `);
    const result = finalizeGatewayRequest(
      {
        document,
        variables: { deferIt: false },
      },
      {
        targetSchema: schema,
        subschema: schema,
        fieldName: 'product',
        operation: 'query',
        returnType: schema.getQueryType()!.getFields().product.type,
        info: infoWithVars({ deferIt: false }),
      } as any,
      () => {},
    );

    const op = result.document.definitions.find(d => d.kind === Kind.OPERATION_DEFINITION)!;
    const product = op.selectionSet.selections.find(
      s => s.kind === Kind.FIELD && s.name.value === 'product',
    ) as any;
    const names: string[] = [];
    for (const sel of product.selectionSet.selections) {
      if (sel.kind === Kind.FIELD) {
        names.push(sel.name.value);
      } else if (sel.kind === Kind.INLINE_FRAGMENT) {
        for (const inner of sel.selectionSet.selections) {
          if (inner.kind === Kind.FIELD) names.push(inner.name.value);
        }
        // Disabled defer should be stripped
        expect(sel.directives?.some((d: any) => d.name.value === 'defer')).toBeFalsy();
      }
    }
    expect(names).toContain('name');
  });
});
