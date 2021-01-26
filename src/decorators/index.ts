import { EventSubscriberMetadataBuilder } from '../metadata';
import { Newable } from '../interfaces';

export function EventSubscriber(): ClassDecorator {
  return (target: any) => {
    EventSubscriberMetadataBuilder.getOrCreateSubscriberMetadata(target);
  };
}

interface OnConfig {
  priority?: number;
  background?: boolean;
}

export function On<T>(
  eventOrEvents: Newable<T> | Newable<T>[],
  config: OnConfig = {}
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
        priority: config.priority,
        background: config.background
      });
    });
  };
}
