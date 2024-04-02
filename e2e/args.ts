export function getPortArg(args: string[]): number | null {
  let port = null as number | null;
  for (const arg of args) {
    const [, portPart] = arg.split('--port=');
    if (portPart) {
      port = parseInt(portPart);
      if (isNaN(port)) {
        throw new Error(`Port arg value "${portPart}" is not a number.`);
      }
      break;
    }
  }
  return port;
}

export function getTargetArg(args: string[]): string | null {
  let target = null as string | null;
  for (const arg of args) {
    [, target] = arg.split('--target=');
    if (target) {
      break;
    }
  }
  if (!target) {
    target = null;
  }
  return target;
}
