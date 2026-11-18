import {
  columnMapFromSelection,
  mapDocumentToGraphql,
  parseMongoMapping,
  projectionFromSelection,
  resolveMappingValue,
} from '../src/mapping.js';

describe('parseMongoMapping', () => {
  it('parses column selection and skips comments', () => {
    const parsed = parseMongoMapping(`
      # User columns
      id: _id
      name: name
      age: age
    `);
    expect(columnMapFromSelection(parsed)).toEqual(
      new Map([
        ['id', '_id'],
        ['name', 'name'],
        ['age', 'age'],
      ]),
    );
  });

  it('parses $args / $this, spreads, and nested blocks', () => {
    const parsed = parseMongoMapping(`
      _id: $this.id
      ...$args.where
      address {
        street: address.street
      }
    `);
    expect(parsed.entries[0].value).toEqual({
      kind: 'this',
      value: 'id',
      path: ['id'],
    });
    expect(parsed.entries[1]).toMatchObject({
      spread: true,
      key: '...$args.where',
      value: {
        kind: 'args',
        value: 'where',
        path: ['where'],
      },
    });
    const address = parsed.entries.find(e => e.key === 'address');
    expect(address?.children?.[0].key).toBe('street');
    expect(address?.children?.[0].value).toEqual({
      kind: 'column',
      value: 'address.street',
    });
  });

  it('parses bare $args.where as a whole-value binder', () => {
    const parsed = parseMongoMapping(`$args.where`);
    expect(parsed.entries).toEqual([
      {
        key: '$args.where',
        value: { kind: 'args', value: 'where', path: ['where'] },
      },
    ]);
    expect(
      resolveMappingValue(parsed.entries[0].value, {
        args: { where: { name: { eq: 'Ada' } } },
      }),
    ).toEqual({ name: { eq: 'Ada' } });
  });

  it('builds projection and maps documents', () => {
    const parsed = parseMongoMapping(`
      id: _id
      name: name
      street: address.street
    `);
    expect(projectionFromSelection(parsed)).toEqual({
      _id: 1,
      name: 1,
      'address.street': 1,
    });
    expect(
      mapDocumentToGraphql({ _id: 'abc', name: 'Ada', address: { street: 'Main' } }, parsed),
    ).toEqual({
      id: 'abc',
      name: 'Ada',
      street: 'Main',
    });
  });

  it('hex-stringifies ObjectId elements inside arrays', () => {
    const parsed = parseMongoMapping(`
      id: _id
      friendIds: friendIds
    `);
    const oid = {
      toHexString() {
        return '507f1f77bcf86cd799439011';
      },
    };
    expect(mapDocumentToGraphql({ _id: 'abc', friendIds: [oid, oid] }, parsed)).toEqual({
      id: 'abc',
      friendIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439011'],
    });
  });

  it('maps nested / recursive documents from _id to id', () => {
    const parsed = parseMongoMapping(`
      id: _id
      children: children
    `);
    const childOid = {
      toHexString() {
        return '507f1f77bcf86cd799439011';
      },
    };
    expect(
      mapDocumentToGraphql(
        {
          _id: 'root',
          children: [{ _id: childOid, name: 'kid', children: [{ _id: 'grand', name: 'g' }] }],
        },
        parsed,
      ),
    ).toEqual({
      id: 'root',
      children: [
        {
          id: '507f1f77bcf86cd799439011',
          name: 'kid',
          children: [{ id: 'grand', name: 'g' }],
        },
      ],
    });
  });
});
