// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var Example_pb = require('./Example_pb.js');

function serialize_io_xtech_example_EmptyRequest(arg) {
  if (!(arg instanceof Example_pb.EmptyRequest)) {
    throw new Error('Expected argument of type io.xtech.example.EmptyRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_io_xtech_example_EmptyRequest(buffer_arg) {
  return Example_pb.EmptyRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_io_xtech_example_Movie(arg) {
  if (!(arg instanceof Example_pb.Movie)) {
    throw new Error('Expected argument of type io.xtech.example.Movie');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_io_xtech_example_Movie(buffer_arg) {
  return Example_pb.Movie.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_io_xtech_example_MoviesResult(arg) {
  if (!(arg instanceof Example_pb.MoviesResult)) {
    throw new Error('Expected argument of type io.xtech.example.MoviesResult');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_io_xtech_example_MoviesResult(buffer_arg) {
  return Example_pb.MoviesResult.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_io_xtech_example_SearchByCastRequest(arg) {
  if (!(arg instanceof Example_pb.SearchByCastRequest)) {
    throw new Error('Expected argument of type io.xtech.example.SearchByCastRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_io_xtech_example_SearchByCastRequest(buffer_arg) {
  return Example_pb.SearchByCastRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var ExampleService = exports.ExampleService = {
  // *
// get all movies
getMovies: {
    path: '/io.xtech.example.Example/GetMovies',
    requestStream: false,
    responseStream: false,
    requestType: Example_pb.EmptyRequest,
    responseType: Example_pb.MoviesResult,
    requestSerialize: serialize_io_xtech_example_EmptyRequest,
    requestDeserialize: deserialize_io_xtech_example_EmptyRequest,
    responseSerialize: serialize_io_xtech_example_MoviesResult,
    responseDeserialize: deserialize_io_xtech_example_MoviesResult,
  },
  // *
// search movies by the name of the cast
searchMoviesByCast: {
    path: '/io.xtech.example.Example/SearchMoviesByCast',
    requestStream: false,
    responseStream: true,
    requestType: Example_pb.SearchByCastRequest,
    responseType: Example_pb.Movie,
    requestSerialize: serialize_io_xtech_example_SearchByCastRequest,
    requestDeserialize: deserialize_io_xtech_example_SearchByCastRequest,
    responseSerialize: serialize_io_xtech_example_Movie,
    responseDeserialize: deserialize_io_xtech_example_Movie,
  },
};

exports.ExampleClient = grpc.makeGenericClientConstructor(ExampleService);
