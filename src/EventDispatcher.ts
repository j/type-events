import { Newable, ContainerLike } from './interfaces';
import { EventSubscriberMetadataBuilder } from './metadata';
import { isPromise } from './utils/isPromise';

export type Handler = <T>(event: T) => Promise<void>;

export interface HandlerConfig {
  EventSubscriber: Newable;
  method: string;
  priority?: number;
  background?: boolean;
}

export interface Loggable {
  log(...data: any[]);
}

export interface EventDispatcherConfig {
  subscribers: Newable[];
  container?: ContainerLike;
  logger?: Loggable;
}

const defaultContainer = {
  get: <T>(EventSubscriber: new (...args: any[]) => T) => new EventSubscriber()
};

export class EventDispatcher {
  protected container: ContainerLike;
  protected handlers: Map<Newable, HandlerConfig[]> = new Map();
  protected logger: Loggable;

  constructor(config: EventDispatcherConfig) {
    this.container = config.container || defaultContainer;
    this.logger = config.logger || { log: console.log };

    EventSubscriberMetadataBuilder.build({ dispatcher: this, ...config });
  }

  async dispatch<T>(event: T): Promise<void> {
    const Newable = (event as any).constructor;

    if (!this.handlers.has(Newable)) {
      return;
    }

    const deferred: Array<() => Promise<void>> = [];

    for (let config of this.handlers.get(Newable)) {
      const serviceOrPromise = this.container.get(config.EventSubscriber);

      if (serviceOrPromise) {
        const service = isPromise(serviceOrPromise)
          ? await serviceOrPromise
          : serviceOrPromise;

        if (config.background) {
          deferred.push(() => service[config.method](event));
        } else {
          await service[config.method](event);
        }
      }
    }

    Promise.all(deferred.map(fn => fn())).catch(err => this.logger.log(err));
  }

  addSubscriber<T>(Newable: Newable<T>, subscriber: HandlerConfig): void {
    const subscribers = this.getEventSubscribers(Newable);

    subscriber.priority =
      typeof subscriber.priority !== 'undefined' ? subscriber.priority : 0;
    subscriber.background =
      typeof subscriber.background !== 'undefined'
        ? subscriber.background
        : false;

    subscribers.push(subscriber);
    this.sortSubscribers(subscribers);
  }

  private getEventSubscribers(Newable: Newable): HandlerConfig[] {
    let handlers: HandlerConfig[];

    if (!this.handlers.has(Newable)) {
      handlers = [];
      this.handlers.set(Newable, handlers);
    } else {
      handlers = this.handlers.get(Newable);
    }

    return handlers;
  }

  private sortSubscribers(subscribers: HandlerConfig[]) {
    subscribers.sort((a, b) => b.priority - a.priority);
  }
}
