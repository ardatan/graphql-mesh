import {
  GraphQLScalarType,
  GraphQLID,
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLList,
} from 'graphql';
import {
  GraphQLByte,
  GraphQLDateTime,
  GraphQLTime,
  GraphQLDate,
  GraphQLNonNegativeInt,
  GraphQLBigInt,
  GraphQLNonPositiveInt,
  GraphQLPositiveInt,
  GraphQLNegativeInt,
  GraphQLDuration,
  GraphQLURL,
  GraphQLHexadecimal,
} from 'graphql-scalars';

/**
 * Resolver that converts WSDL types, that are not fully defined in the WSDL itself, to GraphQL types.
 * This is especially necessary for all primitive WSDL types (resp. scalar GraphQL types) like 'string', 'datetime', etc.
 *
 * You can provide your own resolver to handle custom types of your WSDL.
 * But you must still provide resolvment for primitive types like 'string', e.g by re-using DefaultTypeResolver.
 */
export interface CustomTypeResolver {
  outputType(typeName: string): GraphQLOutputType;
  inputType(typeName: string): GraphQLInputType;
}

/**
 * Default implementation of CustomTypeResolver.
 * Based on https://www.w3.org/TR/xmlschema-2/#built-in-datatypes
 */
export class DefaultTypeResolver implements CustomTypeResolver {
  string = GraphQLString;
  base64Binary = GraphQLByte;
  hexBinary = GraphQLHexadecimal;
  duration = GraphQLDuration;
  gYearMonth = GraphQLString;
  gYear = GraphQLString;
  gMonthDay = GraphQLString;
  gDay = GraphQLString;
  gMonth = GraphQLString;
  anyURI = GraphQLURL;
  QName = GraphQLString;
  normalizedString = GraphQLString;
  token = GraphQLString;
  NMTOKEN = GraphQLString;
  NMTOKENS = GraphQLString;
  language = GraphQLString;
  Name = GraphQLString;
  NCName = GraphQLString;
  IDREF = GraphQLID;
  IDREFS = new GraphQLList(GraphQLID);
  ENTITY = GraphQLID;
  ENTITIES = new GraphQLList(GraphQLID);

  ID = GraphQLID;

  boolean = GraphQLBoolean;

  byte = GraphQLByte;
  unsignedByte = GraphQLByte;
  short = GraphQLInt;
  unsignedShort = GraphQLNonNegativeInt;
  int = GraphQLInt;
  unsignedInt = GraphQLNonNegativeInt;
  integer = GraphQLInt;
  positiveInteger = GraphQLPositiveInt;
  nonPositiveInteger = GraphQLNonPositiveInt;
  negativeInteger = GraphQLNegativeInt;
  nonNegativeInteger = GraphQLNonNegativeInt;
  long = GraphQLBigInt;
  unsignedLong = GraphQLBigInt;

  decimal = GraphQLFloat;
  float = GraphQLFloat;
  double = GraphQLFloat;

  dateTime = GraphQLDateTime;
  date = GraphQLDate;
  time = GraphQLTime;

  resolve(typeName: string): GraphQLScalarType {
    return this[typeName];
  }

  outputType(typeName: string): GraphQLOutputType {
    return this.resolve(typeName);
  }

  inputType(typeName: string): GraphQLInputType {
    return this.resolve(typeName);
  }
}
