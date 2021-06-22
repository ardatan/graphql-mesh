const reservedNames = ['Query', 'Mutation', 'Subscription'];
export function sanitizeNameForGraphQL(unsafeName: string): string {
  let sanitizedName = '';

  for (const ch of unsafeName.trim()) {
    sanitizedName += /^[_a-zA-Z0-9]*$/.test(ch) ? ch : '_';
  }

  if (!isNaN(parseInt(sanitizedName))) {
    sanitizedName = '_' + sanitizedName;
  }

  // Names cannot start with __
  if (sanitizedName.startsWith('__')) {
    sanitizedName = sanitizedName.replace('__', '_0');
  }

  if (reservedNames.includes(sanitizedName)) {
    sanitizedName += '_';
  }

  return sanitizedName;
}
