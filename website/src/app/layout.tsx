import localFont from 'next/font/local';
import { PRODUCTS } from '@theguild/components';
import { getDefaultMetadata } from '@theguild/components/server';
import { HiveOuterLayout } from '../components/hive-layout/hive-outer-layout';
import '@theguild/components/style.css';

export const metadata = getDefaultMetadata({
  productName: PRODUCTS.MESH.name,
  websiteName: PRODUCTS.MESH.name,
  description: 'A fully-featured GraphQL gateway framework',
});

const neueMontreal = localFont({
  src: [
    { path: '../fonts/PPNeueMontreal-Regular.woff2', weight: '400' },
    { path: '../fonts/PPNeueMontreal-Medium.woff2', weight: '500' },
    { path: '../fonts/PPNeueMontreal-Medium.woff2', weight: '600' },
  ],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <HiveOuterLayout font={neueMontreal}>{children}</HiveOuterLayout>;
}
