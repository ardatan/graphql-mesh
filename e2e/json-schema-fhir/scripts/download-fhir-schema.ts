/**
 * Mirror `examples/json-schema-fhir/scripts/download-fhir-schema.ts`:
 * fetch the official HL7 FHIR R4 JSON Schema zip into this e2e package.
 */
import { ensureFhirSchema } from '../ensure-fhir-schema';

ensureFhirSchema()
  .then(path => {
    console.log(`Wrote ${path}`);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
