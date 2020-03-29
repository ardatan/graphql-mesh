declare module 'string-interpolation/src';

declare global {
    interface ObjectConstructor {
        keys<T>(obj: T): Array<keyof T>;
    }
}