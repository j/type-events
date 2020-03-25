export interface Newable<T = any> {
  new (...args: any[]): T;
}

export interface ContainerLike {
  get: (service: any) => any;
}
