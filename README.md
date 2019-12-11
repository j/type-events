<h1 align="center" style="border-bottom: none;">🔗 type-events</h1>
<h3 align="center">A simple <a href="https://www.typescriptlang.org/docs/handbook/decorators.html">@decorator</a> based event dispatcher.</h3>

### Basics
type-events allows you to create simple ways dispatch and subscribe to events.

```typescript
import { Event, EventDispatcher, EventSubscriber, On } from 'type-events';

class Conversion extends Event {
  constructor(public userAgent: string, public revenue: number) {}
}

class Impression extends Event {
  constructor(public userAgent: string) {}
}

@EventSubscriber()
export class TrackingSubscriber {
  @On(Conversion)
  async onConversion(event: Conversion): Promise<void> {
    // do something with conversion events
  }

  @On(Impression)
  async onImpression(event: Conversion): Promise<void> {
    // do something with conversion events
  }
}

@EventSubscriber()
export class NotifySlack {
  // You can listen on multiple events as well as define it's priority.
  // The higher priority is, the sooner it gets executed
  @On([Impression, Conversion], { priority: -255 })
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