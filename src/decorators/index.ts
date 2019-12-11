import { EventSubscriberMetadataBuilder } from '../metadata';
import { EventConstructor } from '../interfaces';
import { Event } from '../Event';

export function EventSubscriber(): ClassDecorator {
  return (target: any) => {
    EventSubscriberMetadataBuilder.getOrCreateSubscriberMetadata(target);
  };
}

export function On<T extends Event>(
  eventOrEvents: EventConstructor<T> | EventConstructor<T>[],
  config: { priority?: number } = {}
): PropertyDecorator {
  return (target: any, method: string) => {
    const metadata = EventSubscriberMetadataBuilder.getOrCreateSubscriberMetadata(
      target.constructor
    );

    if (!metadata.methods.has(method)) {
      metadata.methods.set(method, new Map());
    }

    const events = Array.isArray(eventOrEvents)
      ? eventOrEvents
      : [eventOrEvents];

    events.forEach(event => {
      metadata.methods.get(method).set(event, {
        method,
        event,
        priority: config.priority || 1
      });
    });
  };
}
