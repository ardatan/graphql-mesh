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

  it('bakes form explode oneOf props via $args.intent.Branch_Input.prop', () => {
    const selection = buildQueryParamsSelection(
      { intent: 'intent' },
      { intent: { destructObject: true, arrayFormat: 'repeat' } },
      {
        intent: {
          type: 'object',
          oneOf: [
            {
              title: 'User Intent',
              properties: {
                idtype: { type: 'string' },
                user_id: { type: 'string' },
              },
            },
            {
              title: 'Wallet Intent',
              properties: {
                idtype: { type: 'string' },
                wallet_id: { type: 'string' },
              },
            },
          ],
        },
      },
    );
    expect(selection).toContain('idtype: $args.intent.User_Intent_Input.idtype');
    expect(selection).toContain('user_id: $args.intent.User_Intent_Input.user_id');
    expect(selection).toContain('idtype: $args.intent.Wallet_Intent_Input.idtype');
    expect(selection).toContain('wallet_id: $args.intent.Wallet_Intent_Input.wallet_id');
    expect(selection).not.toContain('intent: $args.intent');
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
