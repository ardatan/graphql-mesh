const reservedNames = ['Query', 'Mutation', 'Subscription', 'File'];
const KNOWN_CHARACTERS = {
  '+': 'PLUS',
  '-': 'MINUS',
  '>': 'GREATER_THAN',
  '<': 'LESS_THAN',
  '=': 'EQUALS',
  '&': 'AMPERSAND',
  '|': 'PIPE',
  '@': 'AT',
  '*': 'STAR',
  ':': 'COLON',
  '{': 'LEFT_CURLY_BRACE',
  '}': 'RIGHT_CURLY_BRACE',
  '[': 'LEFT_SQUARE_BRACE',
  ']': 'RIGHT_SQUARE_BRACE',
  ',': 'COMMA',
  '%': 'PERCENT',
  $: 'DOLLAR',
  '#': 'POUND',
  '^': 'CARET',
  '~': 'TILDE',
  '?': 'QUESTION_MARK',
  '!': 'EXCLAMATION_MARK',
  '"': 'QUOTATION_MARK',
  "'": 'SINGLE_QUOTE',
  '\\': 'BACKSLASH',
  '/': 'SLASH',
  '.': 'DOT',
  '`': 'BACKTICK',
  ';': 'SEMICOLON',
  '(': 'LEFT_PARENTHESIS',
  ')': 'RIGHT_PARENTHESIS',
};

function getKnownCharacterOrCharCode(ch: string): string {
  return KNOWN_CHARACTERS[ch] || ch.charCodeAt(0).toString();
}

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
      if (/^[_a-zA-Z0-9]$/.test(ch)) {
        sanitizedName += ch;
      } else if (ch === ' ' || ch === '-' || ch === '.') {
        sanitizedName += '_';
      } else {
        sanitizedName += `_${getKnownCharacterOrCharCode(ch)}_`;
      }
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
