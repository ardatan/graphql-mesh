import { pascalCase } from 'pascal-case';
import { createHttpClient } from '@creditkarma/thrift-client';
import type {
  IMethodAnnotations,
  IThriftAnnotations,
  IThriftField,
  IThriftMessage,
  TProtocol,
  TTransport,
} from '@creditkarma/thrift-server-core';
import {
  MessageType,
  TApplicationException,
  TApplicationExceptionCodec,
  TApplicationExceptionType,
  ThriftClient,
  TType,
} from '@creditkarma/thrift-server-core';
import {
  applyCompactSelection,
  enumNameToWire,
  parseCompactArgsToTypeMap,
  parseCompactSelection,
  parseCompactThrows,
  type CompactSelection,
} from './compact-mapping.js';
import type { GraphQLThriftAnnotations, TypeMap, TypeVal } from './types.js';

/**
 * Runtime binding for one `@thrift__rpc` field - parsed by {@link createGraphQLThriftClient}
 * / {@link getThriftExecutor} from directive args.
 *
 * @example
 * ```ts
 * const binding: ThriftRpcBinding = {
 *   functionName: 'add',
 *   messageType: 'CALL',
 *   args: '1(i32): $args.left\n2(i32): $args.right',
 *   selection: '$(i32)',
 * };
 * ```
 */
export type ThriftRpcBinding = {
  /**
   * IDL function name sent in the Thrift message header.
   *
   * @example 'add'
   */
  functionName: string;
  /**
   * Thrift message type (`CALL` or `ONEWAY`).
   *
   * @default 'CALL'
   * @example 'ONEWAY'
   */
  messageType?: 'CALL' | 'ONEWAY';
  /**
   * Compact `@thrift__rpc(args:)` mapping string.
   *
   * @default ''
   * @example '1(struct): $args.request {\n  1(i32): left\n}'
   */
  args?: string;
  /**
   * Compact `@thrift__rpc(selection:)` mapping string.
   *
   * @default '$(void)'
   * @example '$(i32)'
   */
  selection?: string;
  /**
   * Compact IDL throws mapping when the GraphQL return type is a Result union.
   *
   * @example 'InvalidRequest: 1 {\n  message: 1(string)\n}'
   */
  throws?: string;
};

interface IGraphQLThriftClient extends ThriftClient {
  doRequest(methodName: string, args: any, binding: ThriftRpcBinding, context?: any): Promise<any>;
}

/**
 * Build an HTTP binary Thrift client from `@transport(kind: "thrift")` annotations.
 *
 * @example
 * ```ts
 * import { createGraphQLThriftClient } from '@graphql-mesh/transport-thrift';
 *
 * const client = createGraphQLThriftClient({
 *   kind: 'thrift',
 *   subgraph: 'Calc',
 *   location: 'http://localhost:4000/thrift',
 *   headers: [['x-api-key', '123']],
 * });
 * ```
 */
export function createGraphQLThriftClient<Context = any>({
  location,
  headers,
}: GraphQLThriftAnnotations): IGraphQLThriftClient {
  const httpHeaders: Record<string, string> = Array.isArray(headers)
    ? Object.fromEntries(headers)
    : headers || {};
  // creditkarma ThriftClient static stubs (path comes from `location`).
  const serviceName = '';
  const annotations: IThriftAnnotations = {};
  const methodAnnotations: IMethodAnnotations = {};
  const methodNames: string[] = [];

  function getActualType(typeVal: TypeVal): TType {
    if (typeVal.type === 'ref') {
      return TType.I32;
    }
    // Thrift binary has no distinct enum type byte - enums are i32 on the wire.
    if (typeVal.type === TType.ENUM) {
      return TType.I32;
    }
    return typeVal.type as TType;
  }

  class GraphQLThriftClient extends ThriftClient<Context> {
    public static readonly serviceName: string = serviceName;
    public static readonly annotations: IThriftAnnotations = annotations;
    public static readonly methodAnnotations: IMethodAnnotations = methodAnnotations;
    public static readonly methodNames: Array<string> = methodNames;
    public readonly _serviceName: string = serviceName;
    public readonly _annotations: IThriftAnnotations = annotations;
    public readonly _methodAnnotations: IMethodAnnotations = methodAnnotations;
    public readonly _methodNames: Array<string> = methodNames;

    writeType(typeVal: TypeVal, value: any, output: TProtocol) {
      switch (typeVal.type) {
        case 'ref':
          output.writeI32(value);
          break;
        case TType.BOOL:
          output.writeBool(value);
          break;
        case TType.BYTE:
          output.writeByte(value);
          break;
        case TType.DOUBLE:
          output.writeDouble(value);
          break;
        case TType.I16:
          output.writeI16(value);
          break;
        case TType.I32:
          output.writeI32(value);
          break;
        case TType.I64:
          output.writeI64(value.toString());
          break;
        case TType.STRING:
          output.writeString(value);
          break;
        case TType.STRUCT: {
          output.writeStructBegin(typeVal.name);
          const typeMap = typeVal.fields;
          for (const argName in value) {
            const argType = typeMap[argName];
            const argVal = value[argName];
            if (argType) {
              output.writeFieldBegin(argName, getActualType(argType), argType.id);
              this.writeType(argType, argVal, output);
              output.writeFieldEnd();
            }
          }
          output.writeFieldStop();
          output.writeStructEnd();
          break;
        }
        case TType.ENUM:
          // GraphQL carries member names; compact args embed `enum<Name=n,...>` for i32.
          output.writeI32(enumNameToWire(value, typeVal.values));
          break;
        case TType.MAP: {
          const keys = Object.keys(value);
          output.writeMapBegin(
            getActualType(typeVal.keyType),
            getActualType(typeVal.valType),
            keys.length,
          );
          for (const key of keys) {
            this.writeType(typeVal.keyType, key, output);
            const val = value[key];
            this.writeType(typeVal.valType, val, output);
          }
          output.writeMapEnd();
          break;
        }
        case TType.LIST:
          output.writeListBegin(getActualType(typeVal.elementType), value.length);
          for (const element of value) {
            this.writeType(typeVal.elementType, element, output);
          }
          output.writeListEnd();
          break;
        case TType.SET:
          output.writeSetBegin(getActualType(typeVal.elementType), value.length);
          for (const element of value) {
            this.writeType(typeVal.elementType, element, output);
          }
          output.writeSetEnd();
          break;
      }
    }

    /** Binary/compact: field names are not on the wire - index by field id. */
    readTypeById(type: TType, input: TProtocol): any {
      switch (type) {
        case TType.BOOL:
          return input.readBool();
        case TType.BYTE:
          return input.readByte();
        case TType.DOUBLE:
          return input.readDouble();
        case TType.I16:
          return input.readI16();
        case TType.I32:
          return input.readI32();
        case TType.I64:
          return BigInt(input.readI64().toString());
        case TType.STRING:
          return input.readString();
        case TType.STRUCT: {
          const result = new Map<number, any>();
          input.readStructBegin();
          while (true) {
            const field: IThriftField = input.readFieldBegin();
            const fieldType = field.fieldType;
            if (fieldType === TType.STOP) {
              break;
            }
            result.set(field.fieldId, this.readTypeById(fieldType, input));
            input.readFieldEnd();
          }
          input.readStructEnd();
          return result;
        }
        case TType.ENUM:
          return input.readI32();
        case TType.MAP: {
          const result: any = {};
          const map = input.readMapBegin();
          for (let i = 0; i < map.size; i++) {
            const key = this.readTypeById(map.keyType, input);
            const value = this.readTypeById(map.valueType, input);
            result[key] = value;
          }
          input.readMapEnd();
          return result;
        }
        case TType.LIST: {
          const result: any[] = [];
          const list = input.readListBegin();
          for (let i = 0; i < list.size; i++) {
            result.push(this.readTypeById(list.elementType, input));
          }
          input.readListEnd();
          return result;
        }
        case TType.SET: {
          const result: any[] = [];
          const list = input.readSetBegin();
          for (let i = 0; i < list.size; i++) {
            result.push(this.readTypeById(list.elementType, input));
          }
          input.readSetEnd();
          return result;
        }
      }
    }

    async doRequest(methodName: string, args: any, binding: ThriftRpcBinding, context?: any) {
      const fields: TypeMap = parseCompactArgsToTypeMap(binding.args || '');
      const selection: CompactSelection = parseCompactSelection(binding.selection || '$(void)');
      const throws = parseCompactThrows(binding.throws || '');
      const outboundMessageType = binding.messageType || 'CALL';

      const Transport = this.transport;
      const Protocol = this.protocol;
      const writer: TTransport = new Transport();
      const output: TProtocol = new Protocol(writer);
      const id = this.incrementRequestId();
      const wireMessageType =
        outboundMessageType === 'ONEWAY' ? MessageType.ONEWAY : MessageType.CALL;
      output.writeMessageBegin(methodName, wireMessageType, id);
      this.writeType(
        {
          name: pascalCase(methodName) + '__Args',
          type: TType.STRUCT,
          fields,
          id,
        },
        args,
        output,
      );
      output.writeMessageEnd();
      const data: Buffer = await this.connection.send(writer.flush(), context);
      // ONEWAY: fire-and-forget - do not wait for / decode a reply body.
      if (outboundMessageType === 'ONEWAY') {
        return null;
      }
      const reader: TTransport = this.transport.receiver(data);
      const input: TProtocol = new Protocol(reader);
      const { fieldName, messageType }: IThriftMessage = input.readMessageBegin();
      if (fieldName === methodName) {
        if (messageType === MessageType.EXCEPTION) {
          const err: TApplicationException = TApplicationExceptionCodec.decode(input);
          input.readMessageEnd();
          throw err;
        } else {
          const result = this.readTypeById(TType.STRUCT, input) as Map<number, any>;
          input.readMessageEnd();
          if (result.has(0)) {
            const success = applyCompactSelection(selection, result.get(0));
            if (throws.length > 0) {
              return {
                value: success,
                __typename: `${methodName[0].toUpperCase()}${methodName.slice(1)}Success`,
              };
            }
            return success;
          }
          for (const t of throws) {
            if (result.has(t.id)) {
              const projected = applyCompactSelection(
                { kind: 'fields', fields: t.fields },
                result.get(t.id),
              );
              return {
                ...(projected && typeof projected === 'object' ? projected : {}),
                __typename: t.typeName,
              };
            }
          }
          // Non-oneway void success: empty result struct only (no field 0).
          // Nonempty unmatched maps are declared throws with ignoreErrorResponses:true -
          // must not look like success.
          if (selection.kind === 'scalar' && selection.wire === 'void' && result.size === 0) {
            if (throws.length > 0) {
              return {
                ok: true,
                __typename: `${methodName[0].toUpperCase()}${methodName.slice(1)}Success`,
              };
            }
            return null;
          }
          throw new TApplicationException(
            TApplicationExceptionType.UNKNOWN,
            methodName + ' failed: unknown result',
          );
        }
      } else {
        throw new TApplicationException(
          TApplicationExceptionType.WRONG_METHOD_NAME,
          'Received a response to an unknown RPC function: ' + fieldName,
        );
      }
    }
  }

  const locationUrl = new URL(location);

  return createHttpClient(GraphQLThriftClient, {
    hostName: locationUrl.hostname,
    https: locationUrl.protocol === 'https:',
    port: parseInt(locationUrl.port || '80', 10),
    path: locationUrl.pathname,
    protocol: 'binary',
    requestOptions: {
      headers: httpHeaders,
    },
  });
}
