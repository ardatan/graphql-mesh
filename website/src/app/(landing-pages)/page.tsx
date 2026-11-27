import { FrequentlyAskedQuestions } from '@theguild/components';
import { IndexPage } from '../../components/index-page';
import { rootMetadata } from '../metadata';
import MeshFAQ from './faq.mdx';

export const metadata = {
  title: 'GraphQL Mesh',
  description:
    'Federation Framework for any API. Generate, Transform, Serve, Compose, and run on Hive Gateway or Apollo Router.',
  alternates: {
    canonical: '.',
  },
  openGraph: {
    ...rootMetadata.openGraph,
    url: '.',
  },
};

export default function HomePage() {
  return (
    <IndexPage
      faq={
        <FrequentlyAskedQuestions className="mx-4 mt-6 md:mx-6" faqPages={['/']}>
          <MeshFAQ />
        </FrequentlyAskedQuestions>
      }
    />
  );
}
