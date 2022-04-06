const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { printSchema, lexicographicSortSchema } = require('graphql');
const { readFile } = require('fs-extra');

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});

const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(30000);

describe('JSON Schema Covid', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      printSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot('json-schema-covid-schema');
  });
  it.skip('should give correct response for STEP 1: 2 sources side by side', async () => {
    const getDataStep1Query = await readFile(join(__dirname, '../example-queries/getData_step1.graphql'), 'utf8');
    const { execute } = await mesh$;
    const result = await execute(getDataStep1Query);
    result.errors?.forEach(error => console.log(error));
    expect(result.errors).toBeFalsy();
    expect(typeof result?.data?.case?.confirmed).toBe('number');
    expect(result?.data?.case?.countryRegion).toBe('France');
    expect(typeof result?.data?.case?.deaths).toBe('number');

    expect(result?.data?.population?.records).toHaveLength(1);
    expect(result?.data?.population?.records[0]?.fields?.country_name).toBe('France');
    expect(typeof result?.data?.population?.records[0]?.fields?.value).toBe('number');
  });
  it.skip('should give correct response for STEP1: 2 sources side by side', async () => {
    const getDataStep1Query = await readFile(join(__dirname, '../example-queries/getData_step1.graphql'), 'utf8');
    const { execute } = await mesh$;
    const result = await execute(getDataStep1Query);
    expect(result.errors?.length).toBeFalsy();
    expect(typeof result?.data?.case?.confirmed).toBe('number');
    expect(result?.data?.case?.countryRegion).toBe('France');
    expect(typeof result?.data?.case?.deaths).toBe('number');

    expect(result?.data?.population?.records?.length).toBe(1);
    expect(result?.data?.population?.records[0]?.fields?.country_name).toBe('France');
    expect(typeof result?.data?.population?.records[0]?.fields?.value).toBe('number');
  });
  it.skip('should give correct response for STEP2: 2 sources combined', async () => {
    const getDataStep2Query = await readFile(join(__dirname, '../example-queries/getData_step2.graphql'), 'utf8');
    const { execute } = await mesh$;
    const result = await execute(getDataStep2Query);
    expect(result.errors).toBeFalsy();
    expect(typeof result?.data?.case?.confirmed).toBe('number');
    expect(typeof result?.data?.case?.deaths).toBe('number');

    expect(result?.data?.case?.population?.records?.length).toBe(1);
    expect(typeof result?.data?.case?.population?.records[0]?.fields?.value).toBe('number');
  });
  it.skip('should give correct response for STEP3_1: 2 sources combined to get ratios', async () => {
    const getDataStep3_1Query = await readFile(join(__dirname, '../example-queries/getData_step3_1.graphql'), 'utf8');
    const { execute } = await mesh$;
    const result = await execute(getDataStep3_1Query);
    expect(result.errors).toBeFalsy();
    expect(typeof result?.data?.fr?.deathRatio).toBe('number');

    expect(typeof result?.data?.at?.deathRatio).toBe('number');
  });
  it.skip('should give correct response for STEP3_2: 2 sources combined to get ratios & case & population', async () => {
    const getDataStep3_2Query = await readFile(join(__dirname, '../example-queries/getData_step3_2.graphql'), 'utf8');
    const { execute } = await mesh$;
    const result = await execute(getDataStep3_2Query);
    expect(result.errors).toBeFalsy();
    expect(typeof result?.data?.fr?.deathRatio).toBe('number');
    expect(typeof result?.data?.fr?.case?.deaths).toBe('number');
    expect(result?.data?.fr?.population?.records?.length).toBe(1);
    expect(typeof result?.data?.fr?.population?.records[0]?.fields?.value).toBe('number');

    expect(typeof result?.data?.at?.deathRatio).toBe('number');
    expect(typeof result?.data?.at?.case?.deaths).toBe('number');
    expect(result?.data?.at?.population?.records?.length).toBe(1);
    expect(typeof result?.data?.at?.population?.records[0]?.fields?.value).toBe('number');
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
