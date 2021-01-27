export interface Newable<T = any> {
  new (...args: any[]): T;
}

export interface ContainerLike {
  get: (service: any) => any;
}

export type DispatchEvent<T = any> = (...args: any[]) => Promise<T>;

export interface Loggable {
  log(...data: any[]);
  error(message?: any, ...optionalParams: any[]): void;
}
