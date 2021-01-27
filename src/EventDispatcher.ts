import { Newable, ContainerLike, DispatchEvent, Loggable } from './interfaces';
import { EventDispatcherMetadata, EventMetadata } from './metadata';
import { isPromise } from './utils/isPromise';
import { Container } from './utils/Container';
import { Logger } from './utils/Logger';
import { EventDispatcherError } from './utils/errors';

export interface EventDispatcherOptions {
  subscribers: Newable[];
  container?: ContainerLike;
  logger?: Loggable;
}

export interface DispatchableEvent extends EventMetadata {
  dispatch: DispatchEvent;
}

export class EventDispatcher {
  /**
   * All of the events that were built on EventDispatcher instantiation
   */
  protected readonly events: Map<Newable, DispatchableEvent[]> = new Map();

  /**
   * Subscribers that were generated upon an event dispatch that contain
   * all of the subscriber handlers in proper order.
   */
  protected readonly subscribers: Map<Newable, DispatchableEvent[]> = new Map();

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
    this.build(options);
  }

  /**
   * Dispatches the event to all the subscribers.
   */
  async dispatch<T>(event: T): Promise<T> {
    const events = this.getEventSubscribers((event as any).constructor);

    for (const e of events) {
      const result = e.dispatch(event);
      if (isPromise(result)) {
        await result;
      }
    }

    return event;
  }

  /**
   * Builds the events for the given subscribers and pre-computes
   * it's dispatch function.
   */
  private build(options: EventDispatcherOptions): void {
    options.subscribers.forEach(EventSubscriber => {
      if (!EventDispatcherMetadata.subscribers.has(EventSubscriber)) {
        throw new Error(
          `"${EventSubscriber.name}" is not a valid EventSubscriber`
        );
      }

      EventDispatcherMetadata.subscribers
        .get(EventSubscriber)
        .forEach(eventMetadata => {
          const { Event } = eventMetadata;

          if (!this.events.has(Event)) {
            this.events.set(Event, []);
          }

          this.events.get(Event).push({
            ...eventMetadata,
            dispatch: this.createDispatchFunction(eventMetadata)
          });
        });
    });
  }

  /**
   * Creates a tree of all the subscribed events for the given Event and
   * it's inherited parents.
   *
   * Returns the cached version if it was already computed.
   */
  protected getEventSubscribers(Event: Newable): DispatchableEvent[] {
    if (this.subscribers.has(Event)) {
      return this.subscribers.get(Event);
    }

    const events: DispatchableEvent[] = [];

    // check event and it's parents for any other registered events
    let CurrentEvent = Event;
    while (CurrentEvent) {
      if (this.events.has(CurrentEvent)) {
        this.events.get(CurrentEvent).forEach(e => events.push(e));
      }

      CurrentEvent = Object.getPrototypeOf(CurrentEvent);
    }

    events.sort((a, b) => b.priority - a.priority);

    this.subscribers.set(Event, events);

    return events;
  }

  /**
   * Computes the event's "dispatch" method.
   *
   * It sort of optimizes the call by creating different versions of the
   * dispatcher based on it's metadata.
   */
  protected createDispatchFunction(
    eventMetadata: EventMetadata
  ): DispatchEvent {
    const { EventSubscriber, background, method } = eventMetadata;

    const dispatchEvent = (event: any): Promise<any> | any => {
      // containers can potentially resolve dependencies asynchronously
      const subscriber = this.container.get(EventSubscriber);
      if (!subscriber) {
        throw new EventDispatcherError(
          `${EventSubscriber.name} not found in container`
        );
      }

      // resolve container & emit event if container is a promise
      if (isPromise(subscriber)) {
        return subscriber
          .then(s => s[method](event))
          .catch(err => this.logger.error(err));
      }

      try {
        const result = subscriber[method](event);
        if (isPromise(result)) {
          result.catch(err => this.logger.error(err));
        }
        return result;
      } catch (err) {
        this.logger.error(err);
      }
    };

    if (background) {
      return (event: any): any => {
        process.nextTick(() => {
          dispatchEvent(event);
        });
      };
    }

    return (event: any): any => {
      return dispatchEvent(event);
    };
  }
}
