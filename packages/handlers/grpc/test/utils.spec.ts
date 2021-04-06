import { Metadata } from '@grpc/grpc-js';
import { SchemaComposer } from 'graphql-compose';

import {
  addInputOutputFields,
  addMetaDataToCall,
  createEnum,
  createFieldsType,
  getTypeName,
  toSnakeCase,
} from '../src/utils';

describe('grpc utils', () => {
  describe('addMetaDataToCall', () => {
    const grpcClientMethod = jest.fn();
    const input = { sport: 'Baseball' };
    const context = { team: 'Oakland As', players: { pitcher: 'Kershaw' }, number: 42 };
    const binarySportsTeam = Buffer.from([68, 111, 100, 103, 101, 114, 115, 32, 82, 117, 108, 101, 33]);
    const binaryPlayer = Buffer.from([75, 101, 114, 115, 104, 97, 119]);

    function createExpectedMetadata(key: string, value: string | Buffer): Metadata {
      const meta = new Metadata();
      meta.add(key, value);

      return meta;
    }

    test(`when no metadata is supplied by the config`, () => {
      addMetaDataToCall(grpcClientMethod, input, context, undefined);
      expect(grpcClientMethod).toHaveBeenCalledWith(input);
    });

    describe.each<[string, Record<string, string | Buffer | string[]>, Metadata]>([
      ['static', { sportsTeam: 'Dodgers' }, createExpectedMetadata('sportsTeam', 'Dodgers')],
      ['static all lowercase', { sportsteam: 'Dodgers' }, createExpectedMetadata('sportsteam', 'Dodgers')],
      ['dynamic', { bestPlayer: ['players', 'pitcher'] }, createExpectedMetadata('bestplayer', 'Kershaw')],
      ['dynamic number', { jerseyNumber: ['number'] }, createExpectedMetadata('jerseynumber', '42')],
      [
        'dynamic underscore key',
        { best_player: ['players', 'pitcher'] },
        createExpectedMetadata('best_player', 'Kershaw'),
      ],
      [
        'static binary',
        { 'sportsTeam-bin': binarySportsTeam },
        createExpectedMetadata('sportsTeam-bin', binarySportsTeam),
      ],
      ['dynamic binary', { 'bestPlayer-bin': binaryPlayer }, createExpectedMetadata('bestPlayer-bin', binaryPlayer)],
    ])('should generate gRPC Metadata', (type, config, expectedMetadata) => {
      beforeEach(() => {
        grpcClientMethod.mockClear();
      });

      test(`when ${type} metadata is supplied by the config`, () => {
        addMetaDataToCall(grpcClientMethod, input, context, config);
        expect(grpcClientMethod).toHaveBeenCalledWith(input, expectedMetadata);
      });
    });

    describe.each<[string, Record<string, string | Buffer | string[]>]>([
      ['static binary', { sportsTeam: binarySportsTeam }],
      ['dynamic binary', { bestPlayer: binaryPlayer }],
    ])('should throw errors when generating gRPC Metadata', (type, config) => {
      test(`when ${type} metadata is supplied by the config`, () => {
        expect(() => addMetaDataToCall(grpcClientMethod, input, context, config)).toThrow(
          /keys that don't end with '-bin' must have String values/
        );
      });
    });
  });

  describe('createEnum', () => {
    test('should create an enum with the proper type name and values', () => {
      const typeName = 'Sports';
      const fields = { BASEBALL: 0, BASKETBALL: 1 };

      expect(createEnum(typeName, fields)).toEqual({
        name: typeName,
        values: { BASEBALL: { value: 0 }, BASKETBALL: { value: 1 } },
      });
    });
  });

  describe('getTypeName', () => {
    const schemaComposer = new SchemaComposer();
    const enumType = 'Arena';
    schemaComposer.createEnumTC({ name: enumType, values: {} });
    const inputFlag = 'Input';
    const packageName = 'Sports';
    const type = 'Team';

    describe.each<[string, string]>([
      ['bool', 'Boolean'],
      ['bytes', 'Byte'],
      ['double', 'Float'],
      ['fixed32', 'Int'],
      ['fixed64', 'BigInt'],
      ['float', 'Float'],
      ['int32', 'Int'],
      ['int64', 'BigInt'],
      ['sfixed32', 'Int'],
      ['sfixed64', 'BigInt'],
      ['sint32', 'Int'],
      ['sint64', 'BigInt'],
      ['string', 'String'],
      ['uint32', 'UnsignedInt'],
      ['uint64', 'BigInt'],
    ])('scalar types', (scalarType, scalarGqlType) => {
      test(`should return the proper name for ${scalarType}`, () => {
        expect(getTypeName(schemaComposer, scalarType, false, 'Sports')).toBe(scalarGqlType);
      });

      test(`should return the same name for ${scalarType} regardless of input status or package name`, () => {
        expect(getTypeName(schemaComposer, scalarType, true, '')).toBe(scalarGqlType);
      });
    });

    test('should return type without package name prefix', () => {
      const fullTypeName = `${packageName}.Team`;

      expect(getTypeName(schemaComposer, fullTypeName, false, packageName)).toBe(type);
      expect(getTypeName(schemaComposer, fullTypeName, true, packageName)).toBe(type + inputFlag);
    });

    test('should return type with input flag postfix, when it is an input', () => {
      expect(getTypeName(schemaComposer, type, true, packageName)).toBe(type + inputFlag);
    });

    test('should return type without input flag postfix, when it is an input, but also an enum in the schema', () => {
      expect(getTypeName(schemaComposer, enumType, true, packageName)).toBe(enumType);
    });
  });

  describe('createFieldsType', () => {
    test('should create input and output field types', () => {
      expect(createFieldsType('Dodgers')).toEqual({ input: 'DodgersInput', output: 'Dodgers' });
    });
  });

  describe('toSnakeCase', () => {
    test('should convert dot separated string to snake case', () => {
      expect(toSnakeCase('Sports.Baseball.Team')).toEqual('Sports_Baseball_Team');
    });
  });

  describe('addInputOutputFields', () => {
    test('should add `_` field for empty protos', async () => {
      const schemaComposer = new SchemaComposer();
      const inputTC = schemaComposer.createInputTC({
        name: 'input',
        fields: {},
      });
      const outputTC = schemaComposer.createObjectTC({
        name: 'output',
        fields: {},
      });
      const fields = {};
      await addInputOutputFields(schemaComposer, inputTC, outputTC, fields, undefined, undefined, undefined);
      expect(inputTC.getFields()).toHaveProperty('_', expect.anything());
      expect(outputTC.getFields()).toHaveProperty('_', expect.anything());
    });

    test('should add not `_` field for non empty protos', async () => {
      const schemaComposer = new SchemaComposer();
      const inputTC = schemaComposer.createInputTC({
        name: 'input',
        fields: {},
      });
      const outputTC = schemaComposer.createObjectTC({
        name: 'output',
        fields: {},
      });
      const fields = { someField: { type: 'string', name: 'someField', id: 0 } };
      await addInputOutputFields(schemaComposer, inputTC, outputTC, fields, undefined, undefined, undefined);
      expect(inputTC.getFields()).not.toHaveProperty('_', expect.anything());
      expect(outputTC.getFields()).not.toHaveProperty('_', expect.anything());
    });
  });
});
