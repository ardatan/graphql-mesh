import { GraphQLSchema } from 'graphql';
import { YamlConfig } from '@graphql-mesh/types';
import {
  RenameTypes,
  RenameObjectFields,
  RenameInputObjectFields,
  RenameObjectFieldArguments,
} from '@graphql-tools/wrap';
import { ExecutionResult, ExecutionRequest } from '@graphql-tools/utils';
import { Transform, SubschemaConfig, DelegationContext } from '@graphql-tools/delegate';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';

const ignoreList = [
  'date',
  'hostname',
  'regex',
  'json-pointer',
  'relative-json-pointer',
  'uri-reference',
  'uri-template',
  'Date',
  'Time',
  'DateTime',
  'Timestamp',
  'TimeZone',
  'UtcOffset',
  'Duration',
  'ISO8601Duration',
  'LocalDate',
  'LocalTime',
  'LocalEndTime',
  'EmailAddress',
  'NegativeFloat',
  'NegativeInt',
  'NonEmptyString',
  'NonNegativeFloat',
  'NonNegativeInt',
  'NonPositiveFloat',
  'NonPositiveInt',
  'PhoneNumber',
  'PositiveFloat',
  'PositiveInt',
  'PostalCode',
  'UnsignedFloat',
  'UnsignedInt',
  'URL',
  'BigInt',
  'Byte',
  'Long',
  'SafeInt',
  'UUID',
  'GUID',
  'Hexadecimal',
  'HexColorCode',
  'HSL',
  'HSLA',
  'IPv4',
  'IPv6',
  'ISBN',
  'JWT',
  'Latitude',
  'Longitude',
  'MAC',
  'Port',
  'RGB',
  'RGBA',
  'USCurrency',
  'Currency',
  'JSON',
  'JSONObject',
  'IBAN',
  'ObjectID',
  'Void',
  'DID',
  'CountryCode',
  'Locale',
  'RoutingNumber',
  'AccountNumber',
];

export default class WrapRename implements Transform {
  private transforms: Transform[] = [];

  constructor({ config }: { config: YamlConfig.RenameTransform }) {
    for (const change of config.renames) {
      const {
        from: { type: fromTypeName, field: fromFieldName, argument: fromArgumentName },
        to: { type: toTypeName, field: toFieldName, argument: toArgumentName },
        useRegExpForTypes,
        useRegExpForFields,
        useRegExpForArguments,
      } = change;

      const regExpFlags = change.regExpFlags || undefined;

      if (fromTypeName !== toTypeName) {
        let replaceTypeNameFn: (t: string) => string;
        if (useRegExpForTypes) {
          const typeNameRegExp = new RegExp(fromTypeName, regExpFlags);
          replaceTypeNameFn = (t: string) => t.replace(typeNameRegExp, toTypeName);
        } else {
          replaceTypeNameFn = t => (t === fromTypeName ? toTypeName : t);
        }
        this.transforms.push(
          new RenameTypes(typeName => {
            if (ignoreList.includes(typeName)) {
              return typeName;
            }
            return replaceTypeNameFn(typeName);
          }) as any
        );
      }

      if (fromFieldName && toFieldName && fromFieldName !== toFieldName) {
        let replaceFieldNameFn: (typeName: string, fieldName: string) => string;

        if (useRegExpForFields) {
          const fieldNameRegExp = new RegExp(fromFieldName, regExpFlags);
          replaceFieldNameFn = (typeName, fieldName) =>
            typeName === toTypeName ? fieldName.replace(fieldNameRegExp, toFieldName) : fieldName;
        } else {
          replaceFieldNameFn = (typeName, fieldName) =>
            typeName === toTypeName && fieldName === fromFieldName ? toFieldName : fieldName;
        }
        this.transforms.push(new RenameObjectFields(replaceFieldNameFn) as any);
        this.transforms.push(new RenameInputObjectFields(replaceFieldNameFn) as any);
      }

      if (
        fromTypeName &&
        (fromTypeName === toTypeName || useRegExpForTypes) &&
        toFieldName &&
        (fromFieldName === toFieldName || useRegExpForFields) &&
        fromArgumentName &&
        fromArgumentName !== toArgumentName
      ) {
        let replaceArgNameFn: (typeName: string, fieldName: string, argName: string) => string;

        const fieldNameMatch = (fieldName: string) =>
          fieldName ===
          (useRegExpForFields ? fieldName.replace(new RegExp(fromFieldName, regExpFlags), toFieldName) : toFieldName);

        const typeNameMatch = (typeName: string) =>
          typeName ===
          (useRegExpForTypes ? typeName.replace(new RegExp(fromTypeName, regExpFlags), toTypeName) : toTypeName);

        if (useRegExpForArguments) {
          const argNameRegExp = new RegExp(fromArgumentName, regExpFlags);
          replaceArgNameFn = (typeName, fieldName, argName) =>
            typeNameMatch(typeName) && fieldNameMatch(fieldName)
              ? argName.replace(argNameRegExp, toArgumentName)
              : argName;
        } else {
          replaceArgNameFn = (typeName, fieldName, argName) =>
            typeNameMatch(typeName) && fieldNameMatch(fieldName) && argName === fromArgumentName
              ? toArgumentName
              : argName;
        }

        this.transforms.push(new RenameObjectFieldArguments(replaceArgNameFn) as any);
      }
    }
  }

  transformSchema(originalWrappingSchema: GraphQLSchema, subschemaConfig: SubschemaConfig) {
    return applySchemaTransforms(originalWrappingSchema, subschemaConfig, this.transforms);
  }

  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ) {
    return applyRequestTransforms(originalRequest, delegationContext, transformationContext, this.transforms);
  }

  transformResult(originalResult: ExecutionResult, delegationContext: DelegationContext, transformationContext: any) {
    return applyResultTransforms(originalResult, delegationContext, transformationContext, this.transforms);
  }
}
