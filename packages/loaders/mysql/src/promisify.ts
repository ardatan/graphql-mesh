declare module 'util' {
  export function promisify<T>(
    f: (cb: (err: any, res: T) => void) => void,
    thisContext?: any,
  ): () => Promise<T>;
  export function promisify<A, T>(
    f: (arg: A, cb: (err: any, res: T) => void) => void,
    thisContext?: any,
  ): (arg: A) => Promise<T>;
  export function promisify<A, A2, T>(
    f: (arg: A, arg2: A2, cb: (err: any, res: T) => void) => void,
    thisContext?: any,
  ): (arg: A, arg2: A2) => Promise<T>;
  export function promisify<A, A2, A3, T>(
    f: (arg: A, arg2: A2, arg3: A3, cb: (err: any, res: T) => void) => void,
    thisContext?: any,
  ): (arg: A, arg2: A2, arg3: A3) => Promise<T>;
  export function promisify<A, A2, A3, A4, T>(
    f: (arg: A, arg2: A2, arg3: A3, arg4: A4, cb: (err: any, res: T) => void) => void,
    thisContext?: any,
  ): (arg: A, arg2: A2, arg3: A3, arg4: A4) => Promise<T>;
  export function promisify<A, A2, A3, A4, A5, T>(
    f: (arg: A, arg2: A2, arg3: A3, arg4: A4, arg5: A5, cb: (err: any, res: T) => void) => void,
    thisContext?: any,
  ): (arg: A, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Promise<T>;
}
