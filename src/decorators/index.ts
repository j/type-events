import { EventDispatcherMetadata } from '../metadata';
import { Newable } from '../interfaces';

interface OnOptions {
  priority?: number;
  background?: boolean;
}

export function On<T>(
  Event: Newable<T>,
  options?: OnOptions
): PropertyDecorator;
export function On<T>(
  Events: Newable<T>[],
  options?: OnOptions
): PropertyDecorator;
export function On<T>(
  EventOrEvents: Newable<T> | Newable<T>[],
  options: OnOptions = {}
): PropertyDecorator {
  return (target: any, method: string) => {
    const Events = Array.isArray(EventOrEvents)
      ? EventOrEvents
      : [EventOrEvents];

    Events.map(Event => {
      EventDispatcherMetadata.addEventMetadata({
        Event,
        EventSubscriber: target.constructor,
        method,
        priority: options.priority || 0,
        background: options.background || false
      });
    });
  };
}
