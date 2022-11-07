import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI, { createBundle } from '../src';

const schemas = {
  DeepL: 'deepl.json',
  GitHub: 'github.json',
  Instagram: 'instagram.json',
  IBMLanguageTranslator: 'ibm_language_translator.json',
  InfiniteRecursion: 'infinite-recursion.yml',
  Kubernetes: 'kubernetes.json',
  Pet: 'pet.yml',
  Stripe: 'stripe.json',
  Toto: 'toto.yml',
  Jira: 'jira.json',
  WeatherUnderground: 'weather_underground.json',
  Dictionary: 'dictionary.json',
  Headers: 'headers.json',
  SubscriptionType: 'subscriptionType.yml',
};

describe('Schemas', () => {
  for (const schemaName in schemas) {
    describe(schemaName, () => {
      const schemaPath = schemas[schemaName];
      it('should generate the correct bundle', async () => {
        const bundle = await createBundle(schemaName, {
          source: `./fixtures/${schemaPath}`,
          cwd: __dirname,
        });
        expect(bundle).toMatchSnapshot(schemaName);
      });
      it('should generate the correct schema', async () => {
        const schema = await loadGraphQLSchemaFromOpenAPI(schemaName, {
          source: `./fixtures/${schemaPath}`,
          cwd: __dirname,
        });
        expect(printSchemaWithDirectives(schema)).toMatchSnapshot(schemaName);
      });
    });
  }
});
