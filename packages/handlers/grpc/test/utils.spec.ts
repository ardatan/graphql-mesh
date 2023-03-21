/* eslint-disable @typescript-eslint/no-floating-promises */
import { process } from '@graphql-mesh/cross-helpers';
import { Metadata } from '@grpc/grpc-js';
import { addMetaDataToCall } from '../src/utils.js';

describe('grpc utils', () => {
  describe('addMetaDataToCall', () => {
    const grpcClientMethod = jest.fn();
    const input = { sport: 'Baseball' };
    const context = { team: 'Oakland As', players: { pitcher: 'Kershaw' }, number: 42 };
    const binarySportsTeam = Buffer.from([
      68, 111, 100, 103, 101, 114, 115, 32, 82, 117, 108, 101, 33,
    ]);
    const binaryPlayer = Buffer.from([75, 101, 114, 115, 104, 97, 119]);

    function createExpectedMetadata(key: string, value: string | Buffer): Metadata {
      const meta = new Metadata();
      meta.add(key, value);

      return meta;
    }

    test(`when no metadata is supplied by the config`, () => {
      addMetaDataToCall(grpcClientMethod, input, { context, env: process.env }, undefined);
      expect(grpcClientMethod).toHaveBeenCalledWith(input, expect.any(Function));
    });

    describe.each<[string, Record<string, string | Buffer | string[]>, Metadata]>([
      ['static', { sportsTeam: 'Dodgers' }, createExpectedMetadata('sportsTeam', 'Dodgers')],
      [
        'static all lowercase',
        { sportsteam: 'Dodgers' },
        createExpectedMetadata('sportsteam', 'Dodgers'),
      ],
      [
        'dynamic',
        { bestPlayer: ['players', 'pitcher'] },
        createExpectedMetadata('bestplayer', 'Kershaw'),
      ],
      [
        'dynamic number',
        { jerseyNumber: ['number'] },
        createExpectedMetadata('jerseynumber', '42'),
      ],
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
      [
        'dynamic binary',
        { 'bestPlayer-bin': binaryPlayer },
        createExpectedMetadata('bestPlayer-bin', binaryPlayer),
      ],
    ])('should generate gRPC Metadata', (type, config, expectedMetadata) => {
      beforeEach(() => {
        grpcClientMethod.mockClear();
      });

      test(`when ${type} metadata is supplied by the config`, () => {
        addMetaDataToCall(grpcClientMethod, input, { context, env: process.env }, config);
        expect(grpcClientMethod).toHaveBeenCalledWith(
          input,
          expectedMetadata,
          expect.any(Function),
        );
      });
    });

    describe.each<[string, Record<string, string | Buffer | string[]>]>([
      ['static binary', { sportsTeam: binarySportsTeam }],
      ['dynamic binary', { bestPlayer: binaryPlayer }],
    ])('should throw errors when generating gRPC Metadata', (type, config) => {
      test(`when ${type} metadata is supplied by the config`, () => {
        expect(() =>
          addMetaDataToCall(grpcClientMethod, input, { context, env: process.env }, config),
        ).toThrow(/keys that don't end with '-bin' must have String values/);
      });
    });
  });
});
