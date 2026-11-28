import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { createRouter } from '@graphql-hive/federation-gateway-audit';
import {
  createGatewayRuntime,
  GatewayRuntime,
  useCustomFetch,
} from '@graphql-hive/gateway-runtime';
import {
  ExecutionResult,
  filterSchema,
  getDirective,
  MapperKind,
  mapSchema,
} from '@graphql-tools/utils';
import {
  buildSchema,
  getNamedType,
  GraphQLSchema,
  isEnumType,
  lexicographicSortSchema,
  printSchema,
} from 'graphql';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe('Federation Compatibility', () => {
  const auditRouter = createRouter();
  const supergraphList = readdirSync(
    join(
      __dirname,
      '../../../node_modules/@graphql-hive/federation-gateway-audit/src/test-suites',
    ),
  );
  const supergraphSdlMap = new Map<string, string>();
  type SupergraphTestDefinition = { query: string; expected: any }[];
  const supergraphTestMap = new Map<string, SupergraphTestDefinition>();
  const oldPunishForPoorPlans = process.env['PUNISH_FOR_POOR_PLANS'];
  beforeAll(async () => {
    process.env['PUNISH_FOR_POOR_PLANS'] = '1';
    const supergraphPathListRes = await auditRouter.fetch(
      'http://localhost/supergraphs',
    );
    if (!supergraphPathListRes.ok) {
      const error = await supergraphPathListRes.text();
      throw new Error(`Failed to fetch supergraph list: ${error}`);
    }
    const supergraphPathList = await supergraphPathListRes.json();
    for (const supergraphPath of supergraphPathList) {
      if (supergraphPath) {
        const supergraphRes = await auditRouter.fetch(supergraphPath);
        const supergraphPathParts = supergraphPath.split('/');
        const supergraphName =
          supergraphPathParts[supergraphPathParts.length - 2];
        const supergraphSdl = await supergraphRes.text();
        supergraphSdlMap.set(supergraphName, supergraphSdl);
        const testsPath = supergraphPath.replace('/supergraph', '/tests');
        const testsRes = await auditRouter.fetch(testsPath);
        const testsContent = await testsRes.json();
        supergraphTestMap.set(supergraphName, testsContent);
      }
    }
  });

  afterAll(() => {
    process.env['PUNISH_FOR_POOR_PLANS'] = oldPunishForPoorPlans;
  });

  for (const supergraphName of supergraphList) {
    describe(supergraphName, () => {
      let stitchedSchema: GraphQLSchema;
      let supergraphSdl: string;
      const testFile = readFileSync(
        join(
          __dirname,
          '../../../node_modules/@graphql-hive/federation-gateway-audit/src/test-suites',
          supergraphName,
          'test.ts',
        ),
        'utf-8',
      );
      let tests: SupergraphTestDefinition = Array<{
        query: string;
        expected: any;
      }>(testFile.match(/createTest\(/g)?.length ?? 0).fill({
        query: '',
        expected: {},
      });
      let gatewayRuntime: GatewayRuntime;
      beforeAll(() => {
        supergraphSdl = supergraphSdlMap.get(supergraphName)!;
        tests = supergraphTestMap.get(supergraphName)!;
        stitchedSchema = getStitchedSchemaFromSupergraphSdl({
          supergraphSdl,
          httpExecutorOpts: {
            fetch: auditRouter.fetch,
          },
          batch: true,
        });
        gatewayRuntime = createGatewayRuntime({
          logging: false,
          maskedErrors: false,
          supergraph: supergraphSdl,
          plugins: () => [useCustomFetch(auditRouter.fetch)],
        });
      });
      it('generates the expected schema', () => {
        const inputSchema = buildSchema(supergraphSdl, {
          noLocation: true,
          assumeValid: true,
          assumeValidSDL: true,
        });
        const filteredInputSchema = mapSchema(
          filterSchema({
            schema: inputSchema,
            typeFilter: (typeName, type) =>
              !typeName.startsWith('link__') &&
              !typeName.startsWith('join__') &&
              !typeName.startsWith('core__') &&
              !getDirective(inputSchema, type as any, 'inaccessible')?.length,
            fieldFilter: (_, __, fieldConfig) =>
              !getDirective(inputSchema, fieldConfig, 'inaccessible')?.length,
            argumentFilter: (_, __, ___, argConfig) =>
              !getDirective(inputSchema, argConfig as any, 'inaccessible')
                ?.length,
            enumValueFilter: (_, __, valueConfig) =>
              !getDirective(inputSchema, valueConfig, 'inaccessible')?.length,
            directiveFilter: () => false,
          }),
          {
            [MapperKind.ARGUMENT]: (config) => {
              if (config.defaultValue != null) {
                const namedType = getNamedType(config.type);
                if (isEnumType(namedType)) {
                  const defaultVal = namedType.getValue(
                    config.defaultValue.toString(),
                  );
                  if (!defaultVal) {
                    return {
                      ...config,
                      defaultValue: undefined,
                    };
                  }
                }
              }
              return undefined;
            },
          },
        );
        const sortedInputSchema = lexicographicSortSchema(filteredInputSchema);
        const sortedStitchedSchema = lexicographicSortSchema(stitchedSchema);
        // For Stitching's sanity, if an interface is not implemented by any object type, it should be converted to an object type
        // You can see the difference when you commented this condition out.
        if (supergraphName === 'non-resolvable-interface-object') {
          return;
        }
        expect(printSchema(sortedStitchedSchema).trim()).toBe(
          printSchema(sortedInputSchema).trim(),
        );
      });
      tests.forEach((_, i) => {
        it(`test-query-${i}`, async () => {
          const test = tests[i];
          if (!test) {
            throw new Error(`Test ${i} not found`);
          }
          const response = await gatewayRuntime.fetch(
            'http://localhost/graphql',
            {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                query: test.query,
              }),
            },
          );
          const result: ExecutionResult = await response.json();
          const received = {
            data: result.data ?? null,
            errors: !!result.errors?.length,
          };

          const expected = {
            data: test.expected.data ?? null,
            errors: test.expected.errors ?? false,
          };

          try {
            expect(received).toEqual(expected);
          } catch (e) {
            result.errors?.forEach((err) => {
              console.error(err);
            });
            throw e;
          }
        });
      });
    });
  }
});
