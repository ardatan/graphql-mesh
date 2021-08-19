const reservedNames = ['Query', 'Mutation', 'Subscription'];
export function sanitizeNameForGraphQL(unsafeName: string): string {
  let sanitizedName = '';

  const trimmedUnsafeName = unsafeName.trim();

  if (/^[_a-zA-Z0-9]*$/.test(trimmedUnsafeName)) {
    sanitizedName = trimmedUnsafeName;
  } else {
    for (const ch of trimmedUnsafeName) {
      sanitizedName += /^[_a-zA-Z0-9]*$/.test(ch) ? ch : `_${ch.charCodeAt(0)}_`;
    }
  }

  if (!isNaN(parseInt(trimmedUnsafeName))) {
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
