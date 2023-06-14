import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

const schemas: Record<string, string> = {
  DeepL: 'deepl.json',
  GitHub: 'github.json',
  Instagram: 'instagram.json',
  IBMLanguageTranslator: 'ibm_language_translator.json',
  InfiniteRecursion: 'infinite-recursion.yml',
  Kubernetes: 'kubernetes.json',
  Stripe: 'stripe.json',
  Toto: 'toto.yml',
  Jira: 'jira.json',
  WeatherUnderground: 'weather_underground.json',
  Dictionary: 'dictionary.json',
  Headers: 'headers.json',
  SubscriptionType: 'subscriptionType.yml',
  CloudFlare: 'cloudflare.json',
  TeachersTraining: 'uk_teachers_training_courses.json',
  MeiliSearch: 'meilisearch.yml',
  BlockFrost: 'blockfrost.json',
  'Int64 with Defaults': 'int64-with-defaults.yml',
  'Different fields with the same type': 'different-prop-same-type.yaml',
  'Relative Dereference': 'relative_dereference/api.yml',
  'Default Value as Integer': 'default-int-value.yml',
  'algolia-refs-subset': 'algolia-refs-subset/search/spec.yml', // test case for refs in path and responses
};

describe('Schemas', () => {
  for (const schemaName in schemas) {
    describe(schemaName, () => {
      const schemaPath = schemas[schemaName];
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
