const { findAndParseConfig } = require('@graphql-mesh/config');
const { getMesh } = require('@graphql-mesh/runtime');
const { join, basename } = require('path');
const { introspectionFromSchema, lexicographicSortSchema } = require('graphql');
const { readFile } = require('fs-extra');

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(30000);

describe('JSON Schema FHIR', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot('fhir-schema');
  });
  it('should give correct response for location search query', async () => {
    const LocationSearchQuery = await readFile(join(__dirname, '../example-queries/location-search.query.graphql'), 'utf8');
    const { execute } = await mesh$;

    const result = await execute(LocationSearchQuery);
    expect(result).toMatchSnapshot('location-search-fhir-example-result');
  });
  it('should give correct response for patient search query', async () => {
    const PatientSearchQuery = await readFile(
      join(__dirname, '../example-queries/patient-search.query.graphql'),
      'utf8'
    );
    const { execute } = await mesh$;

    const result = await execute(PatientSearchQuery);
    expect(result).toMatchSnapshot('patient-search-fhir-example-result');
  });
  it('should give correct response for patient query', async () => {
    const PatientQuery = await readFile(join(__dirname, '../example-queries/patient.query.graphql'), 'utf8');
    const { execute } = await mesh$;

    const result = await execute(PatientQuery);
    expect(result.errors).toBeFalsy();
    expect(Array.isArray(result.data?.Patient?.name)).toBeTruthy();
    expect(result.data.Patient.name).toHaveLength(1);
    const nameElement = result.data.Patient.name[0];
    expect(Array.isArray(nameElement.given)).toBeTruthy();
    expect(nameElement.given.length).toBeGreaterThan(0);
    expect(typeof nameElement.given[0]).toBe('string');
    expect(typeof nameElement.family).toBe('string');
    expect(typeof result.data.Patient.gender).toBe('string');
    expect(Array.isArray(result.data.Patient.address)).toBeTruthy();
    expect(result.data.Patient.address.length).toBeGreaterThan(0);
    const addressElement = result.data.Patient.address[0];
    expect(typeof addressElement.city).toBe('string');
    expect(typeof addressElement.country).toBe('string');
    expect(typeof addressElement.case?.deaths).toBe('number');
    expect(typeof addressElement.case?.confirmed).toBe('number');
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
