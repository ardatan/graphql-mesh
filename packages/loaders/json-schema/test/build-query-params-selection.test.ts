import { buildQueryParamsSelection } from '../src/connectAnnotations.js';

describe('buildQueryParamsSelection', () => {
  it('expands deepObject params with known properties', () => {
    const selection = buildQueryParamsSelection(
      { created: 'created' },
      { created: { deepObject: true, destructObject: true } },
      {
        created: {
          type: 'object',
          properties: {
            gt: { type: 'integer' },
            lt: { type: 'integer' },
          },
        },
      },
    );
    expect(selection).toContain('"created[gt]": $args.created.gt');
    expect(selection).toContain('"created[lt]": $args.created.lt');
  });

  it('expands form explode objects to top-level keys', () => {
    const selection = buildQueryParamsSelection(
      { parameters: 'parameters' },
      { parameters: { destructObject: true, arrayFormat: 'repeat' } },
      {
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'integer' },
            offset: { type: 'integer' },
          },
        },
      },
    );
    expect(selection).toContain('limit: $args.parameters.limit');
    expect(selection).toContain('offset: $args.parameters.offset');
    expect(selection).not.toContain('parameters:');
  });

  it('does not bake form explode oneOf props onto $args.intent.idtype', () => {
    const selection = buildQueryParamsSelection(
      { intent: 'intent' },
      { intent: { destructObject: true, arrayFormat: 'repeat' } },
      {
        intent: {
          type: 'object',
          oneOf: [
            {
              properties: {
                idtype: { type: 'string' },
                user_id: { type: 'string' },
              },
            },
          ],
        },
      },
    );
    // GraphQL @oneOf wraps the variant; leave `intent: $args.intent` for runtime.
    expect(selection).toContain('intent: $args.intent');
    expect(selection).not.toContain('idtype:');
  });

  it('expands allowDots object params to dotted keys', () => {
    const selection = buildQueryParamsSelection(
      { searchParameters: 'searchParameters' },
      undefined,
      {
        searchParameters: {
          type: 'object',
          properties: {
            q: { type: 'string' },
            query_by: { type: 'string' },
          },
        },
      },
      { allowDots: true },
    );
    expect(selection).toContain('"searchParameters.q": $args.searchParameters.q');
    expect(selection).toContain('"searchParameters.query_by": $args.searchParameters.query_by');
  });

  it('keeps joinNotNull for comma arrayFormat', () => {
    const selection = buildQueryParamsSelection(
      { ids: 'ids' },
      { ids: { arrayFormat: 'comma' } },
      { ids: { type: 'array' } },
    );
    expect(selection).toContain('ids: $args.ids->joinNotNull(",")');
  });
});
