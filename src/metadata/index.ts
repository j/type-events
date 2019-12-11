import { EventDispatcher } from '../EventDispatcher';
import { Event } from '../Event';
import { EventSubscriberConstructor, ContainerLike } from '../interfaces';

export interface EventSubscriberMethodMetadata<T extends Event = any> {
  method: string;
  event: T;
  priority: number;
}

export interface EventSubscriberMetadata<T = any> {
  EventSubscriber: EventSubscriberConstructor<T>;
  methods: Map<string, Map<any, EventSubscriberMethodMetadata>>;
}

const storage: {
  subscribers: Map<EventSubscriberConstructor, EventSubscriberMetadata>;
} = (global as any).__TYPE_EVENTS_STORAGE__ || {
  subscribers: new Map()
};

const defaultContainer = {
  get: <T>(EventSubscriber: new (...args: any[]) => T) => new EventSubscriber()
};

export interface BuildSubscribersConfig {
  dispatcher: EventDispatcher;
  subscribers: EventSubscriberConstructor[];
  container?: ContainerLike;
}

export class EventSubscriberMetadataBuilder {
  static getOrCreateSubscriberMetadata(
    EventSubscriber: EventSubscriberConstructor
  ) {
    if (!storage.subscribers.has(EventSubscriber)) {
      storage.subscribers.set(EventSubscriber, {
        EventSubscriber,
        methods: new Map()
      });
    }

    return storage.subscribers.get(EventSubscriber);
  }

  static build(config: BuildSubscribersConfig) {
    const { dispatcher, subscribers } = config;

    const container = config.container || defaultContainer;

    subscribers.forEach(EventSubscriber => {
      if (!storage.subscribers.has(EventSubscriber)) {
        throw new Error(
          `"${EventSubscriber.name}" is not a valid EventSubscriber`
        );
      }

      const subscriber = container.get(EventSubscriber);

      storage.subscribers
        .get(EventSubscriber)
        .methods.forEach(methodDefinitions => {
          methodDefinitions.forEach(methodDefinition => {
            dispatcher.addSubscriber(methodDefinition.event, {
              priority: methodDefinition.priority,
              handler: async (event: any) => {
                return subscriber[methodDefinition.method](event);
              }
            });
          });
        });
    });
  }
}
