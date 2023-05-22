export function handleUntitledDefinitions(schemaDocument: any) {
  const seen = new Map<
    string,
    {
      definitionName: string;
      definition: any;
    }
  >();
  function handleDefinitions(definitions: Record<string, any>) {
    for (const definitionName in definitions) {
      const definition = definitions[definitionName];
      if (!definition.$ref) {
        if (!definition.title) {
          definition.title = definitionName;
          if (
            definition.title === 'Subscription' ||
            definition.title === 'Query' ||
            definition.title === 'Mutation'
          ) {
            definition.title += '_';
          }
        } else {
          const seenDefinition = seen.get(definition.title);
          if (seenDefinition) {
            definition.title = definitionName;
            seenDefinition.definition.title = seenDefinition.definitionName;
          }
          seen.set(definition.title, { definitionName, definition });
        }
      }
    }
  }
  if (schemaDocument.definitions) {
    handleDefinitions(schemaDocument.definitions);
  }
  if (schemaDocument.components?.schemas) {
    handleDefinitions(schemaDocument.components.schemas);
  }
  const bodyTypeMap: Record<string, string> = {
    responses: 'response',
    requestBodies: 'request',
  };
  for (const bodyType in bodyTypeMap) {
    const bodies = schemaDocument.components?.[bodyType];
    if (bodies) {
      for (const bodyName in bodies) {
        const body = bodies[bodyName];
        if (body.content) {
          for (const contentType in body.content) {
            const contentObj = body.content[contentType];
            const contentSchema = contentObj.schema;
            if (contentSchema && !contentSchema.$ref) {
              if (!contentSchema.title) {
                contentSchema.title = bodyName;
                if (contentType !== 'application/json') {
                  contentSchema.title += `_${contentType.split('/')[1]}`;
                }
                const suffix = bodyTypeMap[bodyType];
                contentSchema.title += '_' + suffix;
              }
              if (body.description && !contentSchema.description) {
                contentSchema.description = body.description;
              }
            }
          }
        }
      }
    }
  }
  const inputTypeMap: Record<string, string> = {
    parameters: 'parameter',
    headers: 'header',
  };
  for (const inputType in inputTypeMap) {
    const inputs = schemaDocument.components?.[inputType];
    if (inputs) {
      for (const inputName in inputs) {
        const input = inputs[inputName];
        const inputSchema = input.schema;
        if (inputSchema && !inputSchema.$ref) {
          if (!inputSchema.title) {
            const suffix = inputTypeMap[inputType];
            inputSchema.title = inputName + '_' + suffix;
          }
          if (input.description && !inputSchema.description) {
            inputSchema.description = input.description;
          }
        }
      }
    }
  }
}
