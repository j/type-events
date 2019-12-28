<h1 align="center" style="border-bottom: none;">🔗 type-events</h1>
<h3 align="center">A simple <a href="https://www.typescriptlang.org/docs/handbook/decorators.html">@decorator</a> based event dispatcher.</h3>

A simple event dispatcher to dispatch custom events and register synchronous or asynchronous handlers for those events.
By default, events are emitted synchronously (`isAsync: false`) with a `priority` of 0.

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

  @On(Impression)
  async onImpression(event: Impression): Promise<void> {
    // do something with impression events
  }
}

@EventSubscriber()
export class NotifySlack {
  // Make this handler low priority and run without waiting for the result
  // before moving to the next event.
  @On([Impression, Conversion], { priority: -255, isAsync: true })
  async notify(event: Impression | Conversion): Promise<void> {
    if (event instanceof Impression) {
      // do something with impression events
    } else if (event instanceof Conversion) {
      // do something with conversion events
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
Most of the time, you want to use some sort of dependency injection (DI) alongside event dispatching.  Don't you worry, you can still do that.
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
