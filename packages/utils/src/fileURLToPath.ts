import fileUriToPath from 'file-uri-to-path';

export function fileURLToPath(url: string) {
  if (url.startsWith('file://')) {
    return fileUriToPath(url);
  }
  return url;
}
