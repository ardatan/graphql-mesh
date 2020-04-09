import { isAbsolute, join } from 'path';
import objectHash from 'object-hash';

export function computeSnapshotFilePath(options: {
  typeName: string;
  fieldName: string;
  args: any;
  outputDir: string;
}) {
  const argsHash = objectHash(options.args, { ignoreUnknown: true });
  const fileName = [options.typeName, options.fieldName, argsHash].join('_') + '.json';
  const absoluteOutputDir = isAbsolute(options.outputDir) ? options.outputDir : join(process.cwd(), options.outputDir);
  return join(absoluteOutputDir, fileName);
}
