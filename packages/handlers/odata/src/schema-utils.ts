import { EventEmitter } from 'events';

export interface EntityTypeExtensions {
  entityInfo: {
    actualFields: string[];
    navigationFields: string[];
    identifierFieldName?: string;
    identifierFieldTypeRef?: string;
    isOpenType: boolean;
  };
  typeObj: any;
  eventEmitter: EventEmitter;
}
