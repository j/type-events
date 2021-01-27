import { Newable } from '../interfaces';

export interface EventMetadata<T = any> {
  Event: T;
  EventSubscriber: Newable<T>;
  method: string;
  priority: number;
  background: boolean;
}

export class EventDispatcherMetadata {
  static events: Map<Newable, EventMetadata[]> = new Map();
  static subscribers: Map<Newable, EventMetadata[]> = new Map();

  static addEventMetadata(meta: EventMetadata): void {
    // register event and it's subscriber
    if (!this.events.has(meta.Event)) {
      this.events.set(meta.Event, []);
    }

    // ignore duplicate event methods on subscribers
    if (
      !!this.events
        .get(meta.Event)
        .find(
          m =>
            m.EventSubscriber === meta.EventSubscriber &&
            m.method === meta.method
        )
    ) {
      return;
    }

    this.events.get(meta.Event).push(meta);

    // register subscriber and events it's subscribed to
    if (!this.subscribers.has(meta.EventSubscriber)) {
      this.subscribers.set(meta.EventSubscriber, []);
    }
    this.subscribers.get(meta.EventSubscriber).push(meta);
  }

  static assertEventExists(Event: Newable): void {
    if (!this.events.has(Event)) {
      throw new Error(`"${Event.name}" is not a valid decorated "@Event()"`);
    }
  }
}
