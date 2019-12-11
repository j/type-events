import 'reflect-metadata';
import { EventDispatcher, Event, On, EventSubscriber } from '../../src';

class ImpressionEvent extends Event {}

class ConversionEvent extends Event {
  order: string[] = [];
  shouldStopPropagation: boolean = false;
}

describe('DocumentManager', () => {
  let dispatcher: EventDispatcher;

  let spies = {
    onConversionOrImpression: jest.fn(),
    onConversion: jest.fn(),
    afterConversion: jest.fn(),
    beforeConversion: jest.fn(),
    onImpression: jest.fn()
  };

  beforeAll(async () => {
    @EventSubscriber()
    class SlackSubscriber {
      @On([ImpressionEvent, ConversionEvent], { priority: -99 })
      async onConversionOrImpression(event: ConversionEvent | ImpressionEvent) {
        spies.onConversionOrImpression(event);
      }
    }

    @EventSubscriber()
    class ConversionSubscriber {
      @On(ConversionEvent, { priority: 2 })
      onConversion(event: ConversionEvent) {
        event.order.push('onConversion');
        spies.onConversion(event);
      }

      @On(ConversionEvent, { priority: 1 })
      async afterConversion(event: ConversionEvent) {
        event.order.push('afterConversion');
        spies.afterConversion(event);

        if (event.shouldStopPropagation) {
          event.stopPropagation();
        }
      }

      @On(ConversionEvent, { priority: 3 })
      beforeConversion(event: ConversionEvent) {
        event.order.push('beforeConversion');
        spies.beforeConversion(event);
      }
    }

    @EventSubscriber()
    class ImpressionSubscriber {
      @On(ImpressionEvent)
      onImpression(event: ImpressionEvent) {
        spies.onImpression(event);
      }
    }

    dispatcher = new EventDispatcher({
      subscribers: [SlackSubscriber, ConversionSubscriber, ImpressionSubscriber]
    });
  });

  afterEach(() => {
    Object.values(spies).forEach(spy => spy.mockClear());
  });

  test('emits conversion events', async () => {
    const event = new ConversionEvent();
    await dispatcher.dispatch(event);

    expect(spies.onConversion).toBeCalledTimes(1);
    expect(spies.onConversion).toBeCalledWith(event);

    expect(spies.afterConversion).toBeCalledTimes(1);
    expect(spies.afterConversion).toBeCalledWith(event);

    expect(spies.onConversionOrImpression).toBeCalledTimes(1);
    expect(spies.onConversionOrImpression).toBeCalledWith(event);

    expect(spies.onImpression).toBeCalledTimes(0);

    expect(event.order).toEqual([
      'beforeConversion',
      'onConversion',
      'afterConversion'
    ]);
  });

  test('emits impression events', async () => {
    const event = new ImpressionEvent();
    await dispatcher.dispatch(event);

    expect(spies.onImpression).toBeCalledTimes(1);
    expect(spies.onImpression).toBeCalledWith(event);

    expect(spies.onConversionOrImpression).toBeCalledTimes(1);
    expect(spies.onConversionOrImpression).toBeCalledWith(event);

    expect(spies.onConversion).toBeCalledTimes(0);
  });

  test('stops propagation', async () => {
    const event = new ConversionEvent();
    event.shouldStopPropagation = true;
    await dispatcher.dispatch(event);

    expect(spies.onConversion).toBeCalledTimes(1);
    expect(spies.onConversion).toBeCalledWith(event);

    expect(spies.afterConversion).toBeCalledTimes(1);
    expect(spies.afterConversion).toBeCalledWith(event);

    expect(spies.onConversionOrImpression).toBeCalledTimes(0);
    expect(spies.onImpression).toBeCalledTimes(0);

    expect(event.order).toEqual([
      'beforeConversion',
      'onConversion',
      'afterConversion'
    ]);
  });

  test('with custom container', async () => {
    @EventSubscriber()
    class CustomContainerSubscriber {
      @On(ConversionEvent)
      async onConversion(event: ConversionEvent) {
        spies.onConversion(event);
      }
    }

    const getFn = jest.fn();

    const dispatcherWithContainer = new EventDispatcher({
      subscribers: [CustomContainerSubscriber],
      container: {
        get(Service) {
          getFn();

          return new Service();
        }
      }
    });

    const event = new ConversionEvent();
    await dispatcherWithContainer.dispatch(event);

    expect(getFn).toBeCalledTimes(1);
  });

  test('ignores events that do not have any subscribers', async () => {
    class Foo extends Event {}
    await dispatcher.dispatch(new Foo());
    Object.values(spies).forEach(spy => expect(spy).toBeCalledTimes(0));
  });

  test('throws errors on invalid subscriber', async () => {
    class InvalidSubscriber {}

    let e: Error;

    try {
      new EventDispatcher({ subscribers: [InvalidSubscriber] });
    } catch (err) {
      e = err;
    }

    expect(e).toBeInstanceOf(Error);
  });
});
