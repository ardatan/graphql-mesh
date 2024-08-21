export function rebuildOpenInputObjects(input: any) {
  if (typeof input === 'object') {
    if ('rest' in input) {
      Object.assign(input, input.rest);
      delete input.rest;
    }
    for (const fieldName in input) {
      rebuildOpenInputObjects(input[fieldName]);
    }
  }
}
