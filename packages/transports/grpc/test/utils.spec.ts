/* eslint-disable @typescript-eslint/no-floating-promises */
import { GraphQLError } from 'graphql';
import { process } from '@graphql-mesh/cross-helpers';
import { status as GrpcStatus, Metadata } from '@grpc/grpc-js';
import { addMetaDataToCall, toGrpcGraphQLError } from '../src/utils.js';

describe('grpc utils', () => {
  describe('toGrpcGraphQLError', () => {
    test('maps ServiceError into GraphQLError with extensions.grpc', () => {
      const grpcError = Object.assign(new Error('Deadline exceeded'), {
        code: GrpcStatus.DEADLINE_EXCEEDED,
        details: 'Deadline exceeded',
        metadata: new Metadata(),
      });
      const gqlError = toGrpcGraphQLError(grpcError);
      expect(gqlError).toBeInstanceOf(GraphQLError);
      expect((gqlError as GraphQLError).message).toBe('Deadline exceeded');
      expect((gqlError as GraphQLError).extensions).toMatchObject({
        code: 'DOWNSTREAM_SERVICE_ERROR',
        grpc: {
          code: GrpcStatus.DEADLINE_EXCEEDED,
          status: 'DEADLINE_EXCEEDED',
          details: 'Deadline exceeded',
          metadata: {},
        },
      });
    });

    test('passes through non-ServiceError values unchanged', () => {
      const err = new Error('boom');
      expect(toGrpcGraphQLError(err)).toBe(err);
      expect(toGrpcGraphQLError('nope')).toBe('nope');
    });
  });

  describe('addMetaDataToCall', () => {
    const grpcClientMethod = jest.fn();
    beforeEach(() => {
      grpcClientMethod.mockReset();
    });
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

    test(`rejects with GraphQLError when the gRPC callback returns a ServiceError`, async () => {
      grpcClientMethod.mockImplementationOnce((_input, cb) => {
        cb(
          Object.assign(new Error('too big'), {
            code: GrpcStatus.RESOURCE_EXHAUSTED,
            details: 'Received message larger than max',
            metadata: new Metadata(),
          }),
        );
      });
      await expect(
        addMetaDataToCall(grpcClientMethod, input, { context, env: process.env }, undefined),
      ).rejects.toMatchObject({
        message: 'too big',
        extensions: {
          code: 'DOWNSTREAM_SERVICE_ERROR',
          grpc: {
            code: GrpcStatus.RESOURCE_EXHAUSTED,
            status: 'RESOURCE_EXHAUSTED',
          },
        },
      });
    });

    test(`when requestTimeout is supplied, passes a deadline CallOptions`, () => {
      const now = 1_700_000_000_000;
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
      addMetaDataToCall(
        grpcClientMethod,
        input,
        { context, env: process.env },
        undefined,
        false,
        4000,
      );
      expect(grpcClientMethod).toHaveBeenCalledWith(
        input,
        expect.any(Metadata),
        { deadline: now + 4000 },
        expect.any(Function),
      );
      dateNowSpy.mockRestore();
    });

    test(`when requestTimeout and metadata are supplied, passes both`, () => {
      const now = 1_700_000_000_000;
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
      addMetaDataToCall(
        grpcClientMethod,
        input,
        { context, env: process.env },
        { sportsTeam: 'Dodgers' },
        false,
        2500,
      );
      expect(grpcClientMethod).toHaveBeenCalledWith(
        input,
        createExpectedMetadata('sportsTeam', 'Dodgers'),
        { deadline: now + 2500 },
        expect.any(Function),
      );
      dateNowSpy.mockRestore();
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
