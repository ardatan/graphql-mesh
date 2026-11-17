import { GraphQLError, type GraphQLFieldResolver, type GraphQLSchema } from 'graphql';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { createDefaultExecutor, type Transport } from '@graphql-mesh/transport-common';
import { getDirectives, getRootTypes } from '@graphql-tools/utils';
import {
  credentials,
  Metadata,
  type ChannelCredentials,
  type ChannelOptions,
} from '@grpc/grpc-js';
import { makeGenericClientConstructor } from '@grpc/grpc-js';
import { DisposableStack, DisposableSymbols } from '@whatwg-node/disposablestack';
import { fs, path, process } from '@graphql-mesh/cross-helpers';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import type { Logger } from '@graphql-hive/logger';
import type { MeshFetch } from '@graphql-mesh/types';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import { decodeMessage, encodeMessage } from './protobuf/codec.js';
import {
  buildRpcPath,
  httpProtobufUnary,
  isHttpLocation,
  resolveHttpUrl,
} from './protobuf/dial.js';
import { parseMapping } from './protobuf/mapping.js';
import { toGrpcGraphQLError, buildGrpcMetadata } from './utils.js';

export interface ProtobufTransportOptions {
  requestTimeout?: number;
  credentialsSsl?: {
    rootCA?: string;
    certChain?: string;
    privateKey?: string;
  };
  useHTTPS?: boolean;
  metaData?:
    | {
        [k: string]: any;
      }
    | [string, string][];
  channelOptions?: ChannelOptions | [string, string | number][];
  headers?: Record<string, string> | [string, string][];
}

export type gRPCTransportOptions = ProtobufTransportOptions;

export class ProtobufTransportHelper extends DisposableStack {
  private channelCreds: ChannelCredentials | undefined;
  private fetchFn: MeshFetch = defaultFetch;

  constructor(
    private subgraphName: string,
    private baseDir: string,
    private log: Logger,
    private endpoint: string,
    private config: ProtobufTransportOptions,
  ) {
    super();
  }

  setFetch(fetchFn: MeshFetch | undefined) {
    this.fetchFn = fetchFn || defaultFetch;
  }

  getCredentials(): MaybePromise<ChannelCredentials> {
    if (this.config.credentialsSsl) {
      const absolutePrivateKeyPath = path.isAbsolute(this.config.credentialsSsl.privateKey)
        ? this.config.credentialsSsl.privateKey
        : path.join(this.baseDir, this.config.credentialsSsl.privateKey);
      const absoluteCertChainPath = path.isAbsolute(this.config.credentialsSsl.certChain)
        ? this.config.credentialsSsl.certChain
        : path.join(this.baseDir, this.config.credentialsSsl.certChain);

      const sslFiles = [
        fs.promises.readFile(absolutePrivateKeyPath),
        fs.promises.readFile(absoluteCertChainPath),
      ];
      if (this.config.credentialsSsl.rootCA && this.config.credentialsSsl.rootCA !== 'rootCA') {
        const absoluteRootCAPath = path.isAbsolute(this.config.credentialsSsl.rootCA)
          ? this.config.credentialsSsl.rootCA
          : path.join(this.baseDir, this.config.credentialsSsl.rootCA);
        sslFiles.unshift(fs.promises.readFile(absoluteRootCAPath));
      }
      return Promise.all(sslFiles).then(([rootCA, privateKey, certChain]) =>
        credentials.createSsl(rootCA, privateKey, certChain),
      );
    }
    if (this.config.useHTTPS) {
      return credentials.createSsl();
    }
    return credentials.createInsecure();
  }

  processDirectives({ schema, creds }: { schema: GraphQLSchema; creds: ChannelCredentials }) {
    this.channelCreds = creds;
    const location = stringInterpolator.parse(this.endpoint, { env: process.env }) ?? this.endpoint;
    const channelOptions = Array.isArray(this.config.channelOptions)
      ? Object.fromEntries(this.config.channelOptions)
      : this.config.channelOptions;

    for (const type of getRootTypes(schema)) {
      const typeName = type.name;
      for (const field of Object.values(type.getFields())) {
        const directives = getDirectives(schema, field) || [];
        for (const directiveObj of directives) {
          if (
            this.subgraphName &&
            directiveObj.args?.subgraph &&
            directiveObj.args.subgraph !== this.subgraphName
          ) {
            continue;
          }
          if (directiveObj.name !== 'protobuf__rpc' && directiveObj.name !== 'protobufRpc') {
            continue;
          }
          const {
            service,
            method,
            args: argsMapping,
            selection,
            stream: isStream,
          } = directiveObj.args as {
            service?: string;
            method: string;
            args: string;
            selection: string;
            stream?: boolean;
          };
          const argsFields = parseMapping(argsMapping);
          const selectionFields = parseMapping(selection);
          const resolver = this.createRpcResolver({
            location,
            service,
            method,
            argsFields,
            selectionFields,
            isStream: !!isStream,
            channelOptions,
            typeName,
          });
          if (typeName === 'Subscription' || isStream) {
            field.subscribe = resolver;
            field.resolve = (x: any) => x;
          } else {
            field.resolve = resolver;
          }
        }
      }
    }
  }

  private createRpcResolver({
    location,
    service,
    method,
    argsFields,
    selectionFields,
    isStream,
    channelOptions,
    typeName,
  }: {
    location: string;
    service?: string;
    method: string;
    argsFields: ReturnType<typeof parseMapping>;
    selectionFields: ReturnType<typeof parseMapping>;
    isStream: boolean;
    channelOptions?: Record<string, string | number>;
    typeName: string;
  }): GraphQLFieldResolver<any, any> {
    const metaData = this.config.metaData;
    const headersConfig = this.config.headers;
    const timeout = this.config.requestTimeout;
    const creds = this.channelCreds ?? credentials.createInsecure();
    const http = isHttpLocation(location);
    const rpcPath = buildRpcPath(service, method);
    const transportFetch = this.fetchFn;

    return async function protobufRpcResolver(_root, args, context, info) {
      if (isStream && http) {
        throw new GraphQLError(
          'Server streaming protobuf RPCs require a gRPC location (not HTTP Connect/Twirp)',
        );
      }
      const requestBytes = encodeMessage(argsFields, args ?? {});
      try {
        if (http) {
          const url = resolveHttpUrl(location, service, method);
          const headers: Record<string, string> = {};
          const rawHeaders = Array.isArray(headersConfig)
            ? Object.fromEntries(headersConfig)
            : headersConfig;
          if (rawHeaders) {
            for (const [k, v] of Object.entries(rawHeaders)) {
              headers[k] = stringInterpolator.parse(String(v), {
                args,
                context,
                env: process.env,
              });
            }
          }
          const ctrl = timeout ? AbortSignal.timeout(timeout) : undefined;
          const fetchFn: MeshFetch = context?.fetch || transportFetch || defaultFetch;
          const responseBytes = await httpProtobufUnary({
            url,
            body: requestBytes,
            headers,
            signal: ctrl,
            fetchFn,
            context,
            info,
          });
          return decodeMessage(selectionFields, responseBytes);
        }

        // gRPC unary (streaming: use generic client stream — unary first for Subscription via repeated unary not supported; use client streaming API)
        const metadata =
          buildGrpcMetadata(metaData, {
            root: {},
            args,
            context,
            env: process.env,
          }) ?? new Metadata();

        if (isStream || typeName === 'Subscription') {
          const gen = (async function* () {
            for await (const chunk of grpcServerStream({
              location,
              path: rpcPath,
              request: requestBytes,
              creds,
              metadata,
              channelOptions,
            })) {
              yield decodeMessage(selectionFields, chunk);
            }
          })();
          if (typeName === 'Subscription') {
            return gen;
          }
          // Query/Mutation with server-stream: collect messages into a list
          const items: any[] = [];
          for await (const item of gen) {
            items.push(item);
          }
          return items;
        }

        const responseBytes = await grpcUnary({
          location,
          path: rpcPath,
          request: requestBytes,
          creds,
          metadata,
          channelOptions,
          timeout,
        });
        return decodeMessage(selectionFields, responseBytes);
      } catch (err) {
        throw toGrpcGraphQLError(err);
      }
    };
  }
}

/** @deprecated */
export const GrpcTransportHelper = ProtobufTransportHelper;

function grpcUnary(opts: {
  location: string;
  path: string;
  request: Uint8Array;
  creds: ChannelCredentials;
  metadata: Metadata;
  channelOptions?: Record<string, string | number>;
  timeout?: number;
}): Promise<Uint8Array> {
  const Client = makeGenericClientConstructor(
    {
      Invoke: {
        path: opts.path,
        requestStream: false,
        responseStream: false,
        requestSerialize: (v: Uint8Array) => Buffer.from(v),
        requestDeserialize: (v: Buffer) => new Uint8Array(v),
        responseSerialize: (v: Uint8Array) => Buffer.from(v),
        responseDeserialize: (v: Buffer) => new Uint8Array(v),
      },
    },
    'MeshProtobuf',
  );
  const client = new Client(opts.location, opts.creds, opts.channelOptions);
  return new Promise((resolve, reject) => {
    const deadline =
      opts.timeout != null && opts.timeout > 0 ? new Date(Date.now() + opts.timeout) : undefined;
    (client as any).Invoke(
      opts.request,
      opts.metadata,
      deadline ? { deadline } : {},
      (err: Error | null, value?: Uint8Array) => {
        try {
          (client as any).close?.();
        } catch {
          // ignore
        }
        if (err) reject(err);
        else resolve(value ?? new Uint8Array());
      },
    );
  });
}

async function* grpcServerStream(opts: {
  location: string;
  path: string;
  request: Uint8Array;
  creds: ChannelCredentials;
  metadata: Metadata;
  channelOptions?: Record<string, string | number>;
}): AsyncGenerator<Uint8Array> {
  const Client = makeGenericClientConstructor(
    {
      Invoke: {
        path: opts.path,
        requestStream: false,
        responseStream: true,
        requestSerialize: (v: Uint8Array) => Buffer.from(v),
        requestDeserialize: (v: Buffer) => new Uint8Array(v),
        responseSerialize: (v: Uint8Array) => Buffer.from(v),
        responseDeserialize: (v: Buffer) => new Uint8Array(v),
      },
    },
    'MeshProtobuf',
  );
  const client = new Client(opts.location, opts.creds, opts.channelOptions);
  const call = (client as any).Invoke(opts.request, opts.metadata);
  try {
    for await (const chunk of call) {
      yield chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    }
  } finally {
    try {
      (client as any).close?.();
    } catch {
      // ignore
    }
  }
}

const transport: Transport<ProtobufTransportOptions> = {
  getSubgraphExecutor({ transportEntry, subgraph, cwd, log, fetch }) {
    const helper = new ProtobufTransportHelper(
      transportEntry.subgraph,
      cwd,
      log,
      transportEntry.location,
      transportEntry.options || {},
    );
    helper.setFetch(fetch);
    return handleMaybePromise(
      () =>
        isHttpLocation(transportEntry.location)
          ? credentials.createInsecure()
          : helper.getCredentials(),
      creds => {
        helper.processDirectives({ schema: subgraph, creds });
        const executor = createDefaultExecutor(subgraph);
        executor[DisposableSymbols.dispose] = () => helper.dispose();
        return executor;
      },
    );
  },
};

export default transport;
