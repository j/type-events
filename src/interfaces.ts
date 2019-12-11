import { Event } from './Event';

export interface EventSubscriberConstructor<T = any> {
  new (...args: any[]): T;
}

export interface EventConstructor<T extends Event = Event> {
  new (): T;
}

export interface ContainerLike {
  get: <T = any>(service: new (...args: any[]) => T) => T;
}
