const reservedNames = ['Query', 'Mutation', 'Subscription'];
export function sanitizeNameForGraphQL(unsafeName: string): string {
  let sanitizedName = unsafeName.trim();

  if (!isNaN(parseInt(sanitizedName))) {
    if (sanitizedName.startsWith('-')) {
      sanitizedName = sanitizedName.replace('-', 'NEGATIVE_');
    } else {
      sanitizedName = '_' + sanitizedName;
    }
  }

  if (!/^[_a-zA-Z0-9]*$/.test(sanitizedName)) {
    const unsanitizedName = sanitizedName;
    sanitizedName = '';
    for (const ch of unsanitizedName) {
      sanitizedName += /^[_a-zA-Z0-9]*$/.test(ch) ? ch : `_${ch.charCodeAt(0)}_`;
    }
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
