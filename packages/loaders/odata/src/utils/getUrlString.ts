export function getUrlString(url: URL) {
  return decodeURIComponent(url.toString()).split('+').join(' ');
}
