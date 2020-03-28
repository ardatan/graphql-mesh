import { AnyNestedObject, load } from 'protobufjs';

function getFromObject(object: any, path: string, value?: any): any {
  // If path is not defined or it has false value
  if (!path) return undefined;
  // Check if path is string or array. Regex : ensure that we do not have '.' and brackets
  const pathArray: string[] = Array.isArray(path)
    ? path
    : path.split(/[,[\].]/g).filter(Boolean)
  // Find value if exist return otherwise return undefined value;
  return (
    pathArray.reduce((prevObj, key) => prevObj && prevObj[key], object) || value
  )
}

export async function getPackageProtoDefinition(
  protoFile: string,
  packageName: string,
): Promise<AnyNestedObject> {
  const protoDefinition = await load(protoFile);
  const protoDefinitionObject = await protoDefinition.toJSON({
    keepComments: true,
  });
  const packagePaths: string[] = packageName.split('.');

  for (let i: number = 0; i < packagePaths.length; i += 2) {
    packagePaths.splice(i, 0, 'nested');
  }

  return getFromObject(protoDefinitionObject, packagePaths.join('.'));
}
