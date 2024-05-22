export class TransformValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransformValidationError';
  }
}
