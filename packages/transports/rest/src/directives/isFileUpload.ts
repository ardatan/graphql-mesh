export function isFileUpload(
  obj: any,
): obj is { createReadStream: () => AsyncIterable<Uint8Array>; mimetype: string } {
  return typeof obj.createReadStream === 'function';
}
