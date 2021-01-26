import 'reflect-metadata';
import { EventDispatcher, On, EventSubscriber } from '../../src';

class ImpressionEvent {
  order: string[] = [];
}

class ConversionEvent {
  order: string[] = [];
}

describe('DocumentManager', () => {
  let dispatcher: EventDispatcher;

  let spies = {
    onConversionOrImpression: jest.fn(),
    onConversion: jest.fn(),
    afterConversion: jest.fn(),
    beforeConversion: jest.fn(),
    onImpression: jest.fn(),
    onImpressionAsync: jest.fn()
  };

  beforeAll(async () => {
    @EventSubscriber()
    class SlackSubscriber {
      @On([ImpressionEvent, ConversionEvent], { priority: -99 })
      async onConversionOrImpression(event: ConversionEvent | ImpressionEvent) {
        event.order.push('onConversionOrImpression');
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
        return new Promise(resolve => {
          setTimeout(() => {
            event.order.push('afterConversion');
            spies.afterConversion(event);

            resolve();
          }, 100);
        });
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
        event.order.push('onImpression');
        spies.onImpression(event);
      }

      // give this event a super high priority to prove it's being executed last even though
      // the promise starts first
      @On(ImpressionEvent, { background: true, priority: 255 })
      async onImpressionAsync(event: ImpressionEvent) {
        setTimeout(() => {
          event.order.push('onImpressionAsync');
          spies.onImpressionAsync(event);
        }, 250);
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
      'afterConversion',
      'onConversionOrImpression'
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

    expect(event.order).toEqual(['onImpression', 'onConversionOrImpression']);

    await new Promise(resolve => setTimeout(resolve, 300));

    expect(spies.onImpressionAsync).toBeCalledTimes(1);
    expect(spies.onImpressionAsync).toBeCalledWith(event);

    expect(event.order).toEqual([
      'onImpression',
      'onConversionOrImpression',
      'onImpressionAsync'
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
    class Foo {}
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
