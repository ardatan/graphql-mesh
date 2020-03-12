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

function serialize_io_xtech_example_SearchByCastInput(arg) {
  if (!(arg instanceof Example_pb.SearchByCastInput)) {
    throw new Error('Expected argument of type io.xtech.example.SearchByCastInput');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_io_xtech_example_SearchByCastInput(buffer_arg) {
  return Example_pb.SearchByCastInput.deserializeBinary(new Uint8Array(buffer_arg));
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
    requestType: Example_pb.SearchByCastInput,
    responseType: Example_pb.Movie,
    requestSerialize: serialize_io_xtech_example_SearchByCastInput,
    requestDeserialize: deserialize_io_xtech_example_SearchByCastInput,
    responseSerialize: serialize_io_xtech_example_Movie,
    responseDeserialize: deserialize_io_xtech_example_Movie,
  },
};

exports.ExampleClient = grpc.makeGenericClientConstructor(ExampleService);
