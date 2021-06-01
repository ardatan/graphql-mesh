export function sanitizeNameForGraphQL(unsafeName: string): string {
  let sanitizedName = '';

  for (const ch of unsafeName.trim()) {
    sanitizedName += /^[_a-zA-Z0-9]*$/.test(ch) ? ch : '_';
  }

  if (!isNaN(parseInt(sanitizedName))) {
    sanitizedName = '_' + sanitizedName;
  }

  return sanitizedName;
}
