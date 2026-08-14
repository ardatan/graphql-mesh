import { IndexPage } from '../../components/index-page';
import { rootMetadata } from '../metadata';

export const metadata = {
  title: 'GraphQL Mesh',
  description: 'A fully-featured GraphQL gateway framework',
  alternates: {
    canonical: '.',
  },
  openGraph: {
    ...rootMetadata.openGraph,
    url: '.',
  },
};

export default function HomePage() {
  return <IndexPage />;
}
