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

  it('keeps joinNotNull for comma arrayFormat', () => {
    const selection = buildQueryParamsSelection(
      { ids: 'ids' },
      { ids: { arrayFormat: 'comma' } },
      { ids: { type: 'array' } },
    );
    expect(selection).toContain('ids: $args.ids->joinNotNull(",")');
  });
});
