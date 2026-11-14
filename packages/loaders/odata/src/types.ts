// eslint-disable-next-line import/no-nodejs-modules
import type EventEmitter from 'node:events';

/** Emit-time entity metadata (never a public GraphQL directive). */
export interface ODataEntityInfo {
  actualFields: string[];
  navigationFields: string[];
  identifierFieldName?: string;
  identifierFieldTypeRef?: string;
  isOpenType: boolean;
}

/**
 * Field-level emit hints stamped while building the schema composer, then
 * consumed by `emitODataConnectors` to produce `@connect` and discarded.
 * Not GraphQL directives — not in public SDL.
 */
export interface ODataFieldEmit {
  singularNav?: { navigationPropertyName: string };
  pluralNav?: { navigationPropertyName: string };
  navProp?: { navigationPropertyName: string };
  unboundFunction?: { functionName: string };
  boundFunction?: { functionRef: string };
  unboundAction?: { actionName: string };
  boundAction?: { actionRef: string };
  singleton?: { singletonName: string };
  entitySet?: { entitySetName: string };
  entitySetByIdentifier?: {
    entitySetName: string;
    identifierFieldName: string;
    identifierFieldTypeRef: string;
  };
  entitySetCount?: { entitySetName: string };
  createEntitySet?: { entitySetName: string };
  deleteEntitySet?: {
    entitySetName: string;
    identifierFieldName: string;
    identifierFieldTypeRef: string;
  };
  updateEntitySet?: {
    entitySetName: string;
    identifierFieldName: string;
    identifierFieldTypeRef: string;
  };
}

export interface EntityTypeExtensions {
  odata?: {
    entityInfo?: ODataEntityInfo;
  };
  eventEmitter: EventEmitter;
}
