import extractFiles from 'extract-files/extractFiles.mjs';
import isExtractableFile from 'extract-files/isExtractableFile.mjs';
import { type SerializedExecutionRequest } from '@graphql-tools/executor-common';
import { isAsyncIterable } from '@graphql-tools/utils';
import { File as DefaultFile, FormData as DefaultFormData } from '@whatwg-node/fetch';
import { handleMaybePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import { isGraphQLUpload } from './isGraphQLUpload.js';

function collectAsyncIterableValues<T>(asyncIterable: AsyncIterable<T>): MaybePromise<T[]> {
  const values: T[] = [];
  const iterator = asyncIterable[Symbol.asyncIterator]();
  function iterate(): MaybePromise<T[]> {
    return handleMaybePromise(
      () => iterator.next(),
      ({ value, done }) => {
        if (value != null) {
          values.push(value);
        }
        if (done) {
          return values;
        }
        return iterate();
      },
    );
  }
  return iterate();
}

function isExtractableUpload(v: any): boolean {
  if (v == null) {
    return false;
  }
  if (isExtractableFile(v) || isAsyncIterable(v) || typeof v.arrayBuffer === 'function') {
    return true;
  }
  // Direct GraphQL Upload wrappers (filename/mimetype/createReadStream)
  if (isGraphQLUpload(v)) {
    return true;
  }
  // Thenables / promised upload wrappers — require a callable then, not a truthy field
  if (typeof v.then === 'function') {
    return true;
  }
  // Recognized upload wrapper with a thenable promise
  if (v.promise != null && typeof v.promise.then === 'function') {
    return true;
  }
  return false;
}

/** Like `is-plain-obj`, which `extractFiles` goes into. */
function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value)
  );
}

/**
 * Whether `extractFiles` might find an upload in `value`, going into the same lists and plain
 * objects, but without cloning them or tracking their paths. Very deep values, like cyclic
 * ones, are left to `extractFiles`.
 */
function mayHaveUpload(value: unknown, depth: number): boolean {
  // Only objects and functions can be uploads.
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return false;
  }
  if (isExtractableUpload(value)) {
    return true;
  }
  if (depth > 64) {
    return true;
  }
  if (Array.isArray(value) || (typeof FileList !== 'undefined' && value instanceof FileList)) {
    for (const item of value as ArrayLike<unknown> & Iterable<unknown>) {
      if (mayHaveUpload(item, depth + 1)) {
        return true;
      }
    }
    return false;
  }
  if (typeof value === 'object' && isPlainObject(value)) {
    for (const key in value) {
      if (mayHaveUpload((value as Record<string, unknown>)[key], depth + 1)) {
        return true;
      }
    }
  }
  return false;
}

export function createFormDataFromVariables(
  body: SerializedExecutionRequest,
  {
    File: FileCtor = DefaultFile,
    FormData: FormDataCtor = DefaultFormData,
  }: {
    File?: typeof File;
    FormData?: typeof DefaultFormData;
  },
) {
  if (!body.variables) {
    return JSON.stringify(body);
  }
  const vars = Object.assign({}, body.variables);
  // Nearly every request has no files; finding that out should not clone all its variables.
  let mayHaveFiles = false;
  for (const key in vars) {
    if (mayHaveUpload(vars[key], 0)) {
      mayHaveFiles = true;
      break;
    }
  }
  if (!mayHaveFiles) {
    return JSON.stringify(body);
  }
  const { clone, files } = extractFiles(vars, isExtractableUpload as any, 'variables');
  if (files.size === 0) {
    return JSON.stringify(body);
  }
  const map: Record<number, string[]> = {};
  const uploads: any[] = [];
  let currIndex = 0;
  for (const [file, curr] of files) {
    map[currIndex] = curr;
    uploads[currIndex] = file;
    currIndex++;
  }
  const form = new FormDataCtor();
  form.append(
    'operations',
    JSON.stringify({
      ...body,
      variables: clone,
    }),
  );
  form.append('map', JSON.stringify(map));
  function handleUpload(upload: any, i: number): void | PromiseLike<void> {
    const indexStr = i.toString();
    if (upload != null) {
      return handleMaybePromise(
        () => upload?.promise || upload,
        (upload): MaybePromise<void> => {
          const filename = upload.filename || upload.name || upload.path || `blob-${indexStr}`;
          if (isBlob(upload)) {
            form.append(indexStr, upload, filename);
          } else if (isAsyncIterable(upload)) {
            return handleMaybePromise(
              () => collectAsyncIterableValues<any>(upload),
              chunks => {
                // Pass chunks as separate parts so each chunk's bytes are preserved
                // (new Uint8Array(chunks) would coerce Buffer/Uint8Array entries to numbers).
                form.append(indexStr, new FileCtor(chunks, filename), filename);
              },
            );
          } else if (isGraphQLUpload(upload)) {
            return handleMaybePromise(
              () => collectAsyncIterableValues(upload.createReadStream()),
              chunks => {
                form.append(
                  indexStr,
                  new FileCtor(chunks, filename, { type: upload.mimetype }),
                  filename,
                );
              },
            );
          } else {
            form.append(indexStr, new FileCtor([upload], filename), filename);
          }
        },
      );
    }
  }
  const jobs: PromiseLike<void>[] = [];
  for (const i in uploads) {
    const upload = uploads[i];
    const job = handleUpload(upload, Number(i));
    if (isPromise(job)) {
      jobs.push(job);
    }
  }
  if (jobs.length > 0) {
    return Promise.all(jobs).then(() => form);
  }
  return form;
}

function isBlob(obj: any): obj is Blob {
  return typeof obj.arrayBuffer === 'function';
}
