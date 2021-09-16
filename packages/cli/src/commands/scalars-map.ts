export const serverSideScalarsMap = {
  BigInt: 'bigint',
  Byte: 'Buffer',
  Date: 'Date',
  DateTime: 'Date',
  ISO8601Duration: 'string',
  GUID: 'string',
  UnsignedInt: 'number',
  JSON: 'any',
  Timestamp: 'Date',
  Time: 'Date',
  Void: 'void',
  EmailAddress: 'string',
};

export const clientSideScalarsMap = {
  ...serverSideScalarsMap,
  Byte: 'string',
  Date: 'string',
  DateTime: 'string',
  Timestamp: 'number',
  Time: 'string',
};
