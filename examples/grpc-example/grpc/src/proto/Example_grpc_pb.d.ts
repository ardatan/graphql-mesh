// package: io.xtech.example
// file: Example.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "grpc";
import * as Example_pb from "./Example_pb";

interface IExampleService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    getMovies: IExampleService_IGetMovies;
    searchMoviesByCast: IExampleService_ISearchMoviesByCast;
}

interface IExampleService_IGetMovies extends grpc.MethodDefinition<Example_pb.EmptyRequest, Example_pb.MoviesResult> {
    path: string; // "/io.xtech.example.Example/GetMovies"
    requestStream: boolean; // false
    responseStream: boolean; // false
    requestSerialize: grpc.serialize<Example_pb.EmptyRequest>;
    requestDeserialize: grpc.deserialize<Example_pb.EmptyRequest>;
    responseSerialize: grpc.serialize<Example_pb.MoviesResult>;
    responseDeserialize: grpc.deserialize<Example_pb.MoviesResult>;
}
interface IExampleService_ISearchMoviesByCast extends grpc.MethodDefinition<Example_pb.SearchByCastInput, Example_pb.Movie> {
    path: string; // "/io.xtech.example.Example/SearchMoviesByCast"
    requestStream: boolean; // false
    responseStream: boolean; // true
    requestSerialize: grpc.serialize<Example_pb.SearchByCastInput>;
    requestDeserialize: grpc.deserialize<Example_pb.SearchByCastInput>;
    responseSerialize: grpc.serialize<Example_pb.Movie>;
    responseDeserialize: grpc.deserialize<Example_pb.Movie>;
}

export const ExampleService: IExampleService;

export interface IExampleServer {
    getMovies: grpc.handleUnaryCall<Example_pb.EmptyRequest, Example_pb.MoviesResult>;
    searchMoviesByCast: grpc.handleServerStreamingCall<Example_pb.SearchByCastInput, Example_pb.Movie>;
}

export interface IExampleClient {
    getMovies(request: Example_pb.EmptyRequest, callback: (error: grpc.ServiceError | null, response: Example_pb.MoviesResult) => void): grpc.ClientUnaryCall;
    getMovies(request: Example_pb.EmptyRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Example_pb.MoviesResult) => void): grpc.ClientUnaryCall;
    getMovies(request: Example_pb.EmptyRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Example_pb.MoviesResult) => void): grpc.ClientUnaryCall;
    searchMoviesByCast(request: Example_pb.SearchByCastInput, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Example_pb.Movie>;
    searchMoviesByCast(request: Example_pb.SearchByCastInput, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Example_pb.Movie>;
}

export class ExampleClient extends grpc.Client implements IExampleClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public getMovies(request: Example_pb.EmptyRequest, callback: (error: grpc.ServiceError | null, response: Example_pb.MoviesResult) => void): grpc.ClientUnaryCall;
    public getMovies(request: Example_pb.EmptyRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Example_pb.MoviesResult) => void): grpc.ClientUnaryCall;
    public getMovies(request: Example_pb.EmptyRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Example_pb.MoviesResult) => void): grpc.ClientUnaryCall;
    public searchMoviesByCast(request: Example_pb.SearchByCastInput, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Example_pb.Movie>;
    public searchMoviesByCast(request: Example_pb.SearchByCastInput, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Example_pb.Movie>;
}
