<h1 align="center" style="border-bottom: none;">type-events</h1>
<p align="center">
    A simple <a href="https://www.typescriptlang.org/docs/handbook/decorators.html">@decorator</a> based event dispatcher.
</p>

<p align="center">
    <a href="https://www.npmjs.com/~jrdn" target="_blank"><img src="https://img.shields.io/npm/v/type-events.svg" alt="NPM Version" /></a>
    <a href="https://www.npmjs.com/~jrdn" target="_blank"><img src="https://img.shields.io/npm/l/type-events.svg" alt="Package License" /></a>
    <a href="https://www.npmjs.com/~jrdn" target="_blank"><img src="https://img.shields.io/npm/dm/type-events.svg" alt="NPM Downloads" /></a>
</p>

### Basics

`type-events` allows you to create simple ways dispatch and subscribe to events.

```typescript
import { EventDispatcher, On } from 'type-events';

class Conversion {
  constructor(public userAgent: string, public revenue: number) {}
}

class Impression {
  constructor(public userAgent: string) {}
}

export class TrackingSubscriber {
  @On(Conversion)
  async onConversion(event: Conversion): Promise<void> {
    // do something with conversion events
  }

  // The higher the priority, the sooner it's processed.
  // Priority is not guaranteed for same-priority values.
  @On(Impression, { priority: 255 })
  async onImpression(event: Impression): Promise<void> {
    // do something with impression events
  }
}

export class NotifySlack {
  // `background: true` makes this subscriber run after all other
  // subscribers and doesn't wait for the result to finish
  @On([Impression, Conversion], { background: true })
  async notify(event: Impression | Conversion): Promise<void> {
    switch (event.constructor.name) {
      case 'Impression':
        // ...
        break;
      case 'Conversion':
        // ...
        break;
    }
  }
}

const dispatcher = new EventDispatcher({
  subscribers: [TrackingSubscriber, NotifySlack]
});

// then dispatch the events somewhere!
dispatcher.dispatch(new Conversion('Chrome', 13.37));
```

### Custom Container (DI)

Most of the time, you want to use some sort of dependency injection (DI) alongside event dispatching. Don't you worry, you can still do that.
Just pass in an appropriate DI container with a valid `get` method.

```typescript
import { Container } from 'inversify';

const container = new Container();
// container bindings go here

const dispatcher = new EventDispatcher({
  subscribers: [...],
  container
});
```

## Inheritance

Events can extend base classes and subscribers can subscribe to those base classes.

```typescript
import { EventDispatcher, On } from 'type-events';

abstract class BaseEvent {
  // ...
}

class UserCreatedEvent extends BaseEvent {
  // ...
}

class LoggingSubscriber {
  @On(BaseEvent)
  async all(event: BaseEvent): Promise<void> {
    console.log(event);
  }
}

// ...

dispatcher.dispatch(new UserCreatedEvent());
```
