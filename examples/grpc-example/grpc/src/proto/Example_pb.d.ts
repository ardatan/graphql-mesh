// package: io.xtech.example
// file: Example.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Movie extends jspb.Message { 
    getName(): string;
    setName(value: string): void;

    getYear(): number;
    setYear(value: number): void;

    getRating(): number;
    setRating(value: number): void;

    clearCastList(): void;
    getCastList(): Array<string>;
    setCastList(value: Array<string>): void;
    addCast(value: string, index?: number): string;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Movie.AsObject;
    static toObject(includeInstance: boolean, msg: Movie): Movie.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Movie, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Movie;
    static deserializeBinaryFromReader(message: Movie, reader: jspb.BinaryReader): Movie;
}

export namespace Movie {
    export type AsObject = {
        name: string,
        year: number,
        rating: number,
        castList: Array<string>,
    }
}

export class EmptyRequest extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EmptyRequest.AsObject;
    static toObject(includeInstance: boolean, msg: EmptyRequest): EmptyRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EmptyRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EmptyRequest;
    static deserializeBinaryFromReader(message: EmptyRequest, reader: jspb.BinaryReader): EmptyRequest;
}

export namespace EmptyRequest {
    export type AsObject = {
    }
}

export class SearchByCastInput extends jspb.Message { 
    getCastname(): string;
    setCastname(value: string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SearchByCastInput.AsObject;
    static toObject(includeInstance: boolean, msg: SearchByCastInput): SearchByCastInput.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SearchByCastInput, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SearchByCastInput;
    static deserializeBinaryFromReader(message: SearchByCastInput, reader: jspb.BinaryReader): SearchByCastInput;
}

export namespace SearchByCastInput {
    export type AsObject = {
        castname: string,
    }
}

export class MoviesResult extends jspb.Message { 
    clearResultList(): void;
    getResultList(): Array<Movie>;
    setResultList(value: Array<Movie>): void;
    addResult(value?: Movie, index?: number): Movie;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): MoviesResult.AsObject;
    static toObject(includeInstance: boolean, msg: MoviesResult): MoviesResult.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: MoviesResult, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): MoviesResult;
    static deserializeBinaryFromReader(message: MoviesResult, reader: jspb.BinaryReader): MoviesResult;
}

export namespace MoviesResult {
    export type AsObject = {
        resultList: Array<Movie.AsObject>,
    }
}
