import { EventDispatcher } from '../EventDispatcher';
import { Newable, ContainerLike } from '../interfaces';

export interface EventSubscriberMethodMetadata<T = any> {
  method: string;
  event: T;
  priority?: number;
  isAsync?: boolean;
}

export interface EventSubscriberMetadata<T = any> {
  EventSubscriber: Newable<T>;
  methods: Map<string, Map<any, EventSubscriberMethodMetadata>>;
}

const storage: {
  subscribers: Map<Newable, EventSubscriberMetadata>;
} = (global as any).__TYPE_EVENTS_STORAGE__ || {
  subscribers: new Map()
};

export interface BuildSubscribersConfig {
  dispatcher: EventDispatcher;
  subscribers: Newable[];
  container?: ContainerLike;
}

export class EventSubscriberMetadataBuilder {
  static getOrCreateSubscriberMetadata(EventSubscriber: Newable) {
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

    subscribers.forEach(EventSubscriber => {
      if (!storage.subscribers.has(EventSubscriber)) {
        throw new Error(
          `"${EventSubscriber.name}" is not a valid EventSubscriber`
        );
      }

      storage.subscribers
        .get(EventSubscriber)
        .methods.forEach(methodDefinitions => {
          methodDefinitions.forEach(methodDefinition => {
            dispatcher.addSubscriber(methodDefinition.event, {
              EventSubscriber,
              method: methodDefinition.method,
              priority: methodDefinition.priority,
              isAsync: methodDefinition.isAsync
            });
          });
        });
    });
  }
}
