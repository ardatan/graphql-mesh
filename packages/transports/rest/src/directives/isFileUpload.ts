export function isFileUpload(
  obj: any,
): obj is { createReadStream: () => AsyncIterable<Uint8Array>; mimetype: string } {
  return obj != null && typeof obj.createReadStream === 'function';
}
