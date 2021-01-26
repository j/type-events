<h1 align="center" style="border-bottom: none;">type-events</h1>
<p align="center">
    A simple <a href="https://www.typescriptlang.org/docs/handbook/decorators.html">@decorator</a> based event dispatcher.
</p>

### Basics

`type-events` allows you to create simple ways dispatch and subscribe to events.

```typescript
import { EventDispatcher, EventSubscriber, On } from 'type-events';

class Conversion {
  constructor(public userAgent: string, public revenue: number) {}
}

class Impression {
  constructor(public userAgent: string) {}
}

@EventSubscriber()
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

@EventSubscriber()
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

### Advanced

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
