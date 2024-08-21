// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'path';
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
  StackExchange: 'stackexchange-api-v2.2_openapi-v3.0.yaml',
  YouTrack: 'youtrack.json',
  DefaultValues: 'default-values.json',
};

describe('Schemas', () => {
  for (const schemaName in schemas) {
    it(schemaName, () => {
      const schemaPath = schemas[schemaName];
      return expect(
        loadGraphQLSchemaFromOpenAPI(schemaName, {
          source: schemaPath,
          cwd: join(__dirname, 'fixtures'),
        }).then(printSchemaWithDirectives),
      ).resolves.toMatchSnapshot();
    });
  }
});
