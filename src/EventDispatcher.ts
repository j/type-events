import { Newable, ContainerLike, Handler, Loggable } from './interfaces';
import { EventDispatcherMetadata, EventMetadata } from './metadata';
import { Container } from './utils/Container';
import { Logger } from './utils/Logger';
import { EventDispatcherError } from './utils/errors';

export interface EventDispatcherOptions {
  subscribers: Newable[];
  container?: ContainerLike;
  logger?: Loggable;
}

export interface EventListener extends EventMetadata {
  handler: Handler;
}

interface EventListeners {
  normal: EventListener[];
  background: EventListener[];
}

export class EventDispatcher {
  /**
   * All of the events that were built on EventDispatcher instantiation
   */
  protected readonly registered: Map<Newable, EventListener[]> = new Map();

  /**
   * A map containing all the ordered event handlers.
   *
   * The array contains prioritized synchronous events in index 0
   * and background events in index 1.
   */
  protected readonly listeners: Map<Newable, EventListeners> = new Map();

  /**
   * How event subscribers are created.
   */
  protected readonly container: ContainerLike;

  /**
   * Custom logger for instances where a subscriber errors in the background.
   */
  protected readonly logger: Loggable;

  constructor(options: EventDispatcherOptions) {
    this.container = options.container || new Container();
    this.logger = options.logger || new Logger();
    this.buildListeners(options.subscribers);
  }

  /**
   * Dispatches the event to all the subscribers including all subscribers
   * listening on it's parents as well.
   */
  async dispatch<T>(event: T): Promise<T> {
    const { normal, background } = this.getListeners(event?.constructor);
    await this.handleListenersSerially(event, normal);
    await this.handleListenersConcurrently(event, background);

    return event;
  }

  /**
   * Processes non-background event listeners serially.
   */
  protected async handleListenersSerially<T>(
    event: T,
    listeners: EventListener[]
  ): Promise<void> {
    for (const listener of listeners) {
      await listener.handler(event);
    }
  }

  /**
   * Processes background event listeners.
   */
  protected async handleListenersConcurrently<T>(
    event: T,
    listeners: EventListener[]
  ): Promise<void> {
    if (!listeners.length) {
      return;
    }

    setImmediate(() => {
      Promise.all(listeners.map(listener => listener.handler(event)));
    });
  }

  /**
   * Registers the event listeners for the subscribers with a
   * computed "handler" method.
   */
  protected buildListeners(subscribers: Newable[]): void {
    subscribers.forEach(EventSubscriber => {
      if (!EventDispatcherMetadata.subscribers.has(EventSubscriber)) {
        throw new Error(
          `"${EventSubscriber.name}" is not a valid EventSubscriber`
        );
      }

      EventDispatcherMetadata.subscribers
        .get(EventSubscriber)
        .forEach(eventMetadata => {
          const { Event } = eventMetadata;

          if (!this.registered.has(Event)) {
            this.registered.set(Event, []);
          }

          this.registered.get(Event).push({
            ...eventMetadata,
            handler: this.createHandler(eventMetadata)
          });
        });
    });
  }

  /**
   * Computes the event's "handler" method.
   *
   * It sort of optimizes the call by creating different versions of the
   * dispatcher based on it's metadata.
   */
  protected createHandler(eventMetadata: EventMetadata): Handler {
    const { EventSubscriber, method } = eventMetadata;

    return async (event: any): Promise<any> => {
      const subscriber = await Promise.resolve(
        this.container.get(EventSubscriber)
      );
      if (!subscriber) {
        throw new EventDispatcherError(
          `${EventSubscriber.name} not found in container`
        );
      }

      try {
        await Promise.resolve(subscriber[method](event));
      } catch (err) {
        this.logger.error(err);
      }
    };
  }

  /**
   * Generate the entire listener stack which includes it's
   * inherited event handlers.
   */
  protected getListeners(Event: any): EventListeners {
    if (this.listeners.has(Event)) {
      return this.listeners.get(Event);
    }

    const listeners: EventListeners = {
      normal: [],
      background: []
    };

    // check event and it's parents for any other registered events
    let CurrentEvent = Event;
    while (CurrentEvent) {
      if (this.registered.has(CurrentEvent)) {
        this.registered.get(CurrentEvent).forEach(e => {
          listeners[e.background ? 'background' : 'normal'].push(e);
        });
      }

      CurrentEvent = Object.getPrototypeOf(CurrentEvent);
    }

    const sort = a => a.sort((a, b) => b.priority - a.priority);
    sort(listeners.normal);
    sort(listeners.background);

    this.listeners.set(Event, listeners);

    return listeners;
  }
}
