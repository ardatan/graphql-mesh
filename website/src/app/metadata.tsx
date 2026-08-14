import { PRODUCTS } from '@theguild/components/products';
import { getDefaultMetadata } from '@theguild/components/server';

export const websiteName = 'GraphQL Mesh';
export const websiteDescription = PRODUCTS.MESH.title;

export const rootMetadata = getDefaultMetadata({
  description: websiteDescription,
  websiteName,
  productName: 'MESH',
});
