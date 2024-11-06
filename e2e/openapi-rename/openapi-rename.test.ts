import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

describe('OpenAPI w/ Rename Transform', () => {
  it('composes', async () => {
    const { result } = await compose({
      output: 'graphql',
    });
    expect(result).toMatchSnapshot();
  });
  it('should work when renamed', async () => {
    const { output } = await compose({
      output: 'graphql',
    });

    const { execute } = await serve({ supergraph: output });
    const queryResult = await execute({
      query: /* GraphQL */ `
        query MyQuery {
          feed_availability {
            ... on availability {
              in_the_news
              most_read
              on_this_day
              picture_of_the_day
              todays_featured_article
            }
            ... on problem {
              detail
              method
              status
              title
              type
              uri
            }
          }
        }
      `,
    });

    expect(queryResult).toEqual({
      data: {
        feed_availability: {
          in_the_news: [
            'test.wikipedia.org',
            'bs.wikipedia.org',
            'da.wikipedia.org',
            'de.wikipedia.org',
            'el.wikipedia.org',
            'en.wikipedia.org',
            'es.wikipedia.org',
            'fi.wikipedia.org',
            'fr.wikipedia.org',
            'he.wikipedia.org',
            'ko.wikipedia.org',
            'no.wikipedia.org',
            'pl.wikipedia.org',
            'pt.wikipedia.org',
            'ru.wikipedia.org',
            'sco.wikipedia.org',
            'sv.wikipedia.org',
            'vi.wikipedia.org',
          ],
          most_read: ['*.wikipedia.org'],
          on_this_day: [
            'en.wikipedia.org',
            'de.wikipedia.org',
            'fr.wikipedia.org',
            'sv.wikipedia.org',
            'pt.wikipedia.org',
            'ru.wikipedia.org',
            'es.wikipedia.org',
            'ar.wikipedia.org',
            'bs.wikipedia.org',
            'uk.wikipedia.org',
            'it.wikipedia.org',
            'tr.wikipedia.org',
            'zh.wikipedia.org',
          ],
          picture_of_the_day: ['*.wikipedia.org'],
          todays_featured_article: [
            'bg.wikipedia.org',
            'bn.wikipedia.org',
            'bs.wikipedia.org',
            'cs.wikipedia.org',
            'de.wikipedia.org',
            'el.wikipedia.org',
            'en.wikipedia.org',
            'fa.wikipedia.org',
            'he.wikipedia.org',
            'hu.wikipedia.org',
            'it.wikipedia.org',
            'ja.wikipedia.org',
            'la.wikipedia.org',
            'no.wikipedia.org',
            'sco.wikipedia.org',
            'sd.wikipedia.org',
            'sv.wikipedia.org',
            'tr.wikipedia.org',
            'ur.wikipedia.org',
            'vi.wikipedia.org',
            'zh.wikipedia.org',
          ],
        },
      },
    });
  });
});
