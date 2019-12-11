export interface Newable<T = any> {
  new (...args: any[]): T;
}

export interface ContainerLike {
  get: <T = any>(service: Newable<T>) => T;
}
