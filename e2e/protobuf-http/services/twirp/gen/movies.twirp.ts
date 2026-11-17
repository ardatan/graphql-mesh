import {
  TwirpContentType,
  TwirpError,
  TwirpErrorCode,
  TwirpServer,
  chainInterceptors,
  type TwirpContext,
} from "twirp-ts";
import type { Interceptor, RouterEvents } from "twirp-ts";
import { MovieRequest, MoviesResult } from "./movies.js";

//==================================//
//          Client Code             //
//==================================//

interface Rpc {
  request(
    service: string,
    method: string,
    contentType: "application/json" | "application/protobuf",
    data: object | Uint8Array
  ): Promise<object | Uint8Array>;
}

export interface ExampleClient {
  GetMovies(request: MovieRequest): Promise<MoviesResult>;
}

export class ExampleClientJSON implements ExampleClient {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.GetMovies.bind(this);
  }
  GetMovies(request: MovieRequest): Promise<MoviesResult> {
    const data = MovieRequest.toJson(request, {
      useProtoFieldName: true,
      emitDefaultValues: false,
    });
    const promise = this.rpc.request(
      "Example",
      "GetMovies",
      "application/json",
      data as object
    );
    return promise.then((data) =>
      MoviesResult.fromJson(data as any, { ignoreUnknownFields: true })
    );
  }
}

export class ExampleClientProtobuf implements ExampleClient {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.GetMovies.bind(this);
  }
  GetMovies(request: MovieRequest): Promise<MoviesResult> {
    const data = MovieRequest.toBinary(request);
    const promise = this.rpc.request(
      "Example",
      "GetMovies",
      "application/protobuf",
      data
    );
    return promise.then((data) => MoviesResult.fromBinary(data as Uint8Array));
  }
}

//==================================//
//          Server Code             //
//==================================//

export interface ExampleTwirp<T extends TwirpContext = TwirpContext> {
  GetMovies(ctx: T, request: MovieRequest): Promise<MoviesResult>;
}

export enum ExampleMethod {
  GetMovies = "GetMovies",
}

export const ExampleMethodList = [ExampleMethod.GetMovies];

export function createExampleServer<T extends TwirpContext = TwirpContext>(
  service: ExampleTwirp<T>
) {
  return new TwirpServer<ExampleTwirp, T>({
    service,
    packageName: "",
    serviceName: "Example",
    methodList: ExampleMethodList,
    matchRoute: matchExampleRoute,
  });
}

function matchExampleRoute<T extends TwirpContext = TwirpContext>(
  method: string,
  events: RouterEvents<T>
) {
  switch (method) {
    case "GetMovies":
      return async (
        ctx: T,
        service: ExampleTwirp,
        data: Buffer,
        interceptors?: Interceptor<T, MovieRequest, MoviesResult>[]
      ) => {
        ctx = { ...ctx, methodName: "GetMovies" };
        await events.onMatch(ctx);
        return handleExampleGetMoviesRequest(ctx, service, data, interceptors);
      };
    default:
      events.onNotFound();
      const msg = `no handler found`;
      throw new TwirpError(TwirpErrorCode.BadRoute, msg);
  }
}

function handleExampleGetMoviesRequest<T extends TwirpContext = TwirpContext>(
  ctx: T,
  service: ExampleTwirp,
  data: Buffer,
  interceptors?: Interceptor<T, MovieRequest, MoviesResult>[]
): Promise<string | Uint8Array> {
  switch (ctx.contentType) {
    case TwirpContentType.JSON:
      return handleExampleGetMoviesJSON<T>(ctx, service, data, interceptors);
    case TwirpContentType.Protobuf:
      return handleExampleGetMoviesProtobuf<T>(
        ctx,
        service,
        data,
        interceptors
      );
    default:
      const msg = "unexpected Content-Type";
      throw new TwirpError(TwirpErrorCode.BadRoute, msg);
  }
}
async function handleExampleGetMoviesJSON<
  T extends TwirpContext = TwirpContext
>(
  ctx: T,
  service: ExampleTwirp,
  data: Buffer,
  interceptors?: Interceptor<T, MovieRequest, MoviesResult>[]
) {
  let request: MovieRequest;
  let response: MoviesResult;

  try {
    const body = JSON.parse(data.toString() || "{}");
    request = MovieRequest.fromJson(body, { ignoreUnknownFields: true });
  } catch (e) {
    if (e instanceof Error) {
      const msg = "the json request could not be decoded";
      throw new TwirpError(TwirpErrorCode.Malformed, msg).withCause(e, true);
    }
  }

  if (interceptors && interceptors.length > 0) {
    const interceptor = chainInterceptors(...interceptors) as Interceptor<
      T,
      MovieRequest,
      MoviesResult
    >;
    response = await interceptor(ctx, request!, (ctx, inputReq) => {
      return service.GetMovies(ctx, inputReq);
    });
  } else {
    response = await service.GetMovies(ctx, request!);
  }

  return JSON.stringify(
    MoviesResult.toJson(response, {
      useProtoFieldName: true,
      emitDefaultValues: false,
    }) as string
  );
}
async function handleExampleGetMoviesProtobuf<
  T extends TwirpContext = TwirpContext
>(
  ctx: T,
  service: ExampleTwirp,
  data: Buffer,
  interceptors?: Interceptor<T, MovieRequest, MoviesResult>[]
) {
  let request: MovieRequest;
  let response: MoviesResult;

  try {
    request = MovieRequest.fromBinary(data);
  } catch (e) {
    if (e instanceof Error) {
      const msg = "the protobuf request could not be decoded";
      throw new TwirpError(TwirpErrorCode.Malformed, msg).withCause(e, true);
    }
  }

  if (interceptors && interceptors.length > 0) {
    const interceptor = chainInterceptors(...interceptors) as Interceptor<
      T,
      MovieRequest,
      MoviesResult
    >;
    response = await interceptor(ctx, request!, (ctx, inputReq) => {
      return service.GetMovies(ctx, inputReq);
    });
  } else {
    response = await service.GetMovies(ctx, request!);
  }

  return Buffer.from(MoviesResult.toBinary(response));
}
