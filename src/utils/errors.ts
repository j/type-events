export class EventDispatcherError extends Error {
  public name: string = 'EventDispatcherError';

  constructor(message: string) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}
