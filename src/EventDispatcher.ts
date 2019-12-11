import { Event } from './Event';
import {
  EventSubscriberConstructor,
  EventConstructor,
  ContainerLike
} from './interfaces';
import { EventSubscriberMetadataBuilder } from './metadata';

export type Handler = <T extends Event>(event: T) => Promise<void> | void;

export interface HandlerConfig {
  priority: number;
  handler: Handler;
}

export interface EventDispatcherConfig {
  subscribers: EventSubscriberConstructor[];
  container?: ContainerLike;
}

export class EventDispatcher {
  protected handlers: Map<EventConstructor, HandlerConfig[]> = new Map();

  constructor(config: EventDispatcherConfig) {
    EventSubscriberMetadataBuilder.build({ dispatcher: this, ...config });
  }

  async dispatch<T extends Event>(event: T): Promise<void> {
    const EventConstructor = (event as any).constructor;

    if (!this.handlers.has(EventConstructor)) {
      return;
    }

    for (let config of this.handlers.get(EventConstructor)) {
      if (event.isPropagationStopped()) {
        break;
      }

      await config.handler(event);
    }
  }

  addSubscriber(
    EventConstructor: EventConstructor,
    subscriber: HandlerConfig
  ): void {
    const subscribers = this.getEventSubscribers(EventConstructor);
    subscribers.push(subscriber);
    this.sortSubscribers(subscribers);
  }

  private getEventSubscribers(
    EventConstructor: EventConstructor
  ): HandlerConfig[] {
    let handlers: HandlerConfig[];

    if (!this.handlers.has(EventConstructor)) {
      handlers = [];
      this.handlers.set(EventConstructor, handlers);
    } else {
      handlers = this.handlers.get(EventConstructor);
    }

    return handlers;
  }

  private sortSubscribers(subscribers: HandlerConfig[]) {
    subscribers.sort((a, b) => b.priority - a.priority);
  }
}
