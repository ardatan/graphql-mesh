declare module 'grpc-caller' {
  import { Readable } from 'stream';
  export interface GrpcCallerOptions {
    'grpc.max_send_message_length': number;
    'grpc.max_receive_message_length': number;
  }
  export class GrpcResponseStream<T = any> extends Readable {
    [Symbol.asyncIterator](): AsyncIterableIterator<T>;
    cancel(): void;
  }
  export type GrpcResponse<T = any> = Promise<T> | GrpcResponseStream<T>;
  export type GrpcMethod<TData = any, TArgs = any> = (
    args: TArgs,
    params?: any,
    options?: { deadline: number }
  ) => GrpcResponse<TData>;
  export type GrpcCaller = Record<string, GrpcMethod>;
  export type ProtoFilePath = {
    file: string;
    load?: LoadOptions;
  };
  export type LoadOptions = {
    includeDirs?: string[];
  };
  export default function grpcCaller(
    endpoint: string,
    protoFilePath: ProtoFilePath | string,
    name: string,
    greeter: string,
    options: GrpcCallerOptions
  ): GrpcCaller;
}
