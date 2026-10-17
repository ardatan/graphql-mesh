import { Kind, type FieldNode, type SelectionSetNode } from 'graphql';
import type { EntityRule } from '../src/types.js';

const PUBLIC_FIELDS = new Set([
  '__typename',
  'documentId',
  'productId',
  'sku',
  'name',
  'brand',
  'size',
  'regularPrice',
  'department',
  'category',
  'storage',
  'isOrganic',
  'isGlutenFree',
  'isKosher',
  'isHalal',
  'isVegetarian',
  'isVegan',
  'isSnapEligible',
  'isActive',
  'countryOfOrigin',
  'description',
  'ingredients',
  'featuredImage',
  'images',
]);
const MEDIA_FIELDS = new Set([
  '__typename',
  'documentId',
  'name',
  'alternativeText',
  'url',
  'size',
  'width',
  'height',
  'formats',
]);
const object = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

// #9658: only canonical catalog data is public; vendor offers, stock, ownership and user data bypass.
// regularPrice is Strapi's catalog reference price. Vendure vendor selling prices remain uncached.
export function publicCatalogSelection(field: FieldNode): boolean {
  const walk = (set: SelectionSetNode, media = false): boolean =>
    set.selections.every(selection => {
      if (
        selection.kind !== Kind.FIELD ||
        !(media ? MEDIA_FIELDS : PUBLIC_FIELDS).has(selection.name.value)
      )
        return false;
      if (selection.directives?.some(d => !['include', 'skip'].includes(d.name.value)))
        return false;
      if (
        selection.arguments?.length &&
        (selection.name.value !== 'images' ||
          selection.arguments.some(a => a.name.value !== 'pagination'))
      )
        return false;
      if (selection.selectionSet && !['images', 'featuredImage'].includes(selection.name.value))
        return false;
      return !selection.selectionSet || walk(selection.selectionSet, true);
    });
  return !!field.selectionSet && walk(field.selectionSet);
}

export const strapiProductEntityRule: EntityRule = {
  source: 'Strapi',
  field: 'products',
  revision: 'public-catalog-v2-complete',
  entityType: 'Product',
  ttlSeconds: 86400,
  negativeTtlSeconds: 10,
  maxBatchSize: 1000,
  ordering: 'key-grouped',
  // #9658: at the cap, either an omitted SKU or the last positive SKU group can be truncated.
  isComplete: (rows, _keys, args) => {
    const limit = (args.pagination as Record<string, unknown> | undefined)?.limit;
    return (
      typeof limit === 'number' && Number.isSafeInteger(limit) && limit > 0 && rows.length < limit
    );
  },
  scope: () => 'public-catalog',
  selection: publicCatalogSelection,
  mutationFields: ['createProduct', 'updateProduct', 'deleteProduct'],
  identity: row => (object(row) && typeof row.sku === 'string' ? row.sku : null),
  batch(args) {
    if (
      Object.keys(args).some(
        k =>
          ![
            'filters',
            'pagination',
            'sort',
            'status',
            'hasPublishedVersion',
            'publicationFilter',
          ].includes(k),
      )
    )
      return null;
    // #9658: native Strapi injects these defaults. Draft/custom publication views never share.
    if (args.status != null && args.status !== 'PUBLISHED') return null;
    if (args.sort != null && (!Array.isArray(args.sort) || args.sort.length)) return null;
    if (args.hasPublishedVersion != null || args.publicationFilter != null) return null;
    const { filters, pagination } = args;
    if (
      !object(filters) ||
      Object.keys(filters).length !== 1 ||
      !object(filters.sku) ||
      Object.keys(filters.sku).length !== 1 ||
      !Array.isArray(filters.sku.in)
    )
      return null;
    if (!filters.sku.in.every((k: unknown) => typeof k === 'string')) return null;
    if (
      !object(pagination) ||
      Object.keys(pagination).some(k => k !== 'limit') ||
      !Number.isSafeInteger(pagination.limit) ||
      pagination.limit < filters.sku.in.length
    )
      return null;
    return {
      keys: filters.sku.in,
      withKeys: keys => ({ ...args, filters: { sku: { in: keys } } }),
    };
  },
};
