import { ContainerLike, Newable } from '../interfaces';

/**
 * The default container for creating event subscribers.
 *
 * Subscribers, by default, are cached after initialization.
 */
export class Container implements ContainerLike {
  public readonly subscribers: Map<Newable, any> = new Map();

  get<T>(EventSubscriber: Newable): T {
    if (!this.subscribers.has(EventSubscriber)) {
      this.subscribers.set(EventSubscriber, new EventSubscriber());
    }

    return this.subscribers.get(EventSubscriber);
  }
}
