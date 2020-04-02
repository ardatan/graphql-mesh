declare module '@ardatan/string-interpolation';

declare global {
    interface ObjectConstructor {
        keys<T>(obj: T): Array<keyof T>;
    }
}