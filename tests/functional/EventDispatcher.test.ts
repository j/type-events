import 'reflect-metadata';
import { EventDispatcher, On } from '../../src';

class BaseEvent {
  order: string[] = [];
}

class ImpressionOrConversionEvent extends BaseEvent {}

class ImpressionEvent extends ImpressionOrConversionEvent {}

class ConversionEvent extends ImpressionOrConversionEvent {}

describe('DocumentManager', () => {
  let dispatcher: EventDispatcher;

  let spies = {
    onConversionOrImpression: jest.fn(),
    allEventLogger: jest.fn(),
    onConversion: jest.fn(),
    afterConversion: jest.fn(),
    beforeConversion: jest.fn(),
    onImpression: jest.fn(),
    onImpressionAsync: jest.fn()
  };

  beforeAll(async () => {
    class SlackSubscriber {
      @On(ImpressionOrConversionEvent, { priority: -99 })
      async onConversionOrImpression(event: ConversionEvent | ImpressionEvent) {
        event.order.push('onConversionOrImpression');
        spies.onConversionOrImpression(event);
      }

      @On(BaseEvent, { background: true })
      async allEventLogger(event: BaseEvent) {
        event.order.push('allEventLogger');
        spies.allEventLogger(event);
      }
    }

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
      async beforeConversion(event: ConversionEvent) {
        return new Promise(resolve => {
          setTimeout(() => {
            event.order.push('beforeConversion');
            spies.beforeConversion(event);

            resolve();
          }, 100);
        });
      }
    }

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
        return new Promise(resolve => {
          setTimeout(() => {
            event.order.push('onImpressionAsync');
            spies.onImpressionAsync(event);
            resolve();
          }, 100);
        });
      }
    }

    dispatcher = new EventDispatcher({
      subscribers: [SlackSubscriber, ConversionSubscriber, ImpressionSubscriber]
    });
  });

  afterEach(done => {
    Object.values(spies).forEach(spy => spy.mockClear());

    process.nextTick(done);
  });

  test('emits conversion events', async done => {
    const event = new ConversionEvent();
    await dispatcher.dispatch(event);

    expect(spies.onConversion).toBeCalledTimes(1);
    expect(spies.onConversion).toBeCalledWith(event);

    expect(spies.afterConversion).toBeCalledTimes(1);
    expect(spies.afterConversion).toBeCalledWith(event);

    expect(spies.onConversionOrImpression).toBeCalledTimes(1);
    expect(spies.onConversionOrImpression).toBeCalledWith(event);

    expect(spies.allEventLogger).toBeCalledTimes(0);

    expect(spies.onImpression).toBeCalledTimes(0);

    expect(event.order).toEqual([
      'beforeConversion',
      'onConversion',
      'afterConversion',
      'onConversionOrImpression'
    ]);

    process.nextTick(() => {
      expect(spies.allEventLogger).toBeCalledTimes(1);
      expect(spies.allEventLogger).toBeCalledWith(event);

      expect(event.order).toEqual([
        'beforeConversion',
        'onConversion',
        'afterConversion',
        'onConversionOrImpression',
        'allEventLogger'
      ]);

      done();
    });
  });

  test('emits impression events', async done => {
    const event = new ImpressionEvent();
    await dispatcher.dispatch(event);

    expect(spies.onImpression).toBeCalledTimes(1);
    expect(spies.onImpression).toBeCalledWith(event);

    expect(spies.onConversionOrImpression).toBeCalledTimes(1);
    expect(spies.onConversionOrImpression).toBeCalledWith(event);
    expect(spies.allEventLogger).toBeCalledTimes(0);

    expect(spies.onConversion).toBeCalledTimes(0);

    expect(event.order).toEqual(['onImpression', 'onConversionOrImpression']);

    process.nextTick(() => {
      expect(spies.onImpressionAsync).toBeCalledTimes(0);
      expect(spies.allEventLogger).toBeCalledTimes(1);
      expect(spies.allEventLogger).toBeCalledWith(event);

      expect(event.order).toEqual([
        'onImpression',
        'onConversionOrImpression',
        'allEventLogger'
      ]);

      // onImpressionAsync emulates a delay
      setTimeout(() => {
        expect(event.order).toEqual([
          'onImpression',
          'onConversionOrImpression',
          'allEventLogger',
          'onImpressionAsync'
        ]);

        done();
      }, 150);
    });
  });

  test('with custom container', async () => {
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

  test('with custom async container', async () => {
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
        async get(Service) {
          return new Promise(resolve => {
            getFn();

            resolve(new Service());
          });
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
