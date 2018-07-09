import * as domain from 'domain';

import {
  addBreadcrumb,
  captureEvent,
  captureException,
  captureMessage,
  configureScope,
  getDefaultHub,
  init,
  NodeBackend,
  NodeClient,
  Scope,
  SentryEvent,
  SentryResponse,
} from '../src';

const dsn = 'https://53039209a22b4ec1bcc296a3c9fdecd6@sentry.io/4291';

declare var global: any;

describe('SentryNode', () => {
  beforeAll(() => {
    init({ dsn });
  });

  beforeEach(() => {
    getDefaultHub().pushScope();
  });

  afterEach(() => {
    getDefaultHub().popScope();
  });

  describe('getContext() / setContext()', () => {
    test('store/load extra', async () => {
      configureScope((scope: Scope) => {
        scope.setExtra('abc', { def: [1] });
      });
      expect(global.__SENTRY__.hub.stack[1].scope.extra).toEqual({
        abc: { def: [1] },
      });
    });

    test('store/load tags', async () => {
      configureScope((scope: Scope) => {
        scope.setTag('abc', 'def');
      });
      expect(global.__SENTRY__.hub.stack[1].scope.tags).toEqual({
        abc: 'def',
      });
    });

    test('store/load user', async () => {
      configureScope((scope: Scope) => {
        scope.setUser({ id: 'def' });
      });
      expect(global.__SENTRY__.hub.stack[1].scope.user).toEqual({
        id: 'def',
      });
    });
  });

  describe('breadcrumbs', () => {
    let s: jest.Mock<(event: SentryEvent) => Promise<SentryResponse>>;

    beforeEach(() => {
      s = jest
        .spyOn(NodeBackend.prototype, 'sendEvent')
        .mockImplementation(async () => Promise.resolve({ code: 200 }));
    });

    afterEach(() => {
      s.mockReset();
    });

    test('record auto breadcrumbs', done => {
      getDefaultHub().pushScope();
      const client = new NodeClient({
        afterSend: (event: SentryEvent) => {
          // 4 because there is one internal breadcrumb captured by raven-node
          // which captures the event
          expect(event.breadcrumbs!).toHaveLength(4);
          done();
        },
        dsn,
      });
      client.install();
      getDefaultHub().bindClient(client);
      addBreadcrumb({ message: 'test1' });
      addBreadcrumb({ message: 'test2' });
      captureMessage('event');
    });
  });

  describe('capture', () => {
    let s: jest.Mock<(event: SentryEvent) => Promise<SentryResponse>>;

    beforeEach(() => {
      s = jest
        .spyOn(NodeBackend.prototype, 'sendEvent')
        .mockImplementation(async () => Promise.resolve({ code: 200 }));
    });

    afterEach(() => {
      s.mockReset();
    });

    test('capture an exception', done => {
      expect.assertions(6);
      getDefaultHub().pushScope();
      getDefaultHub().bindClient(
        new NodeClient({
          afterSend: (event: SentryEvent) => {
            expect(event.tags).toEqual({ test: '1' });
            expect(event.exception).not.toBeUndefined();
            expect(event.exception!.values[0]).not.toBeUndefined();
            expect(event.exception!.values[0].type).toBe('Error');
            expect(event.exception!.values[0].value).toBe('test');
            expect(event.exception!.values[0].stacktrace).toBeTruthy();
            done();
          },
          dsn,
        }),
      );
      configureScope((scope: Scope) => {
        scope.setTag('test', '1');
      });
      try {
        throw new Error('test');
      } catch (e) {
        captureException(e);
      }
      getDefaultHub().popScope();
    });

    test('capture a message', done => {
      expect.assertions(2);
      getDefaultHub().pushScope();
      getDefaultHub().bindClient(
        new NodeClient({
          afterSend: (event: SentryEvent) => {
            expect(event.message).toBe('test');
            expect(event.exception).toBeUndefined();
            done();
          },
          dsn,
        }),
      );
      captureMessage('test');
      getDefaultHub().popScope();
    });

    test('capture an event', done => {
      expect.assertions(2);
      getDefaultHub().pushScope();
      getDefaultHub().bindClient(
        new NodeClient({
          afterSend: (event: SentryEvent) => {
            expect(event.message).toBe('test');
            expect(event.exception).toBeUndefined();
            done();
          },
          dsn,
        }),
      );
      captureEvent({ message: 'test' });
      getDefaultHub().popScope();
    });

    test('capture an event in a domain', async () =>
      new Promise<void>(resolve => {
        const d = domain.create();
        const client = new NodeClient({
          afterSend: (event: SentryEvent) => {
            expect(event.message).toBe('test');
            expect(event.exception).toBeUndefined();
            resolve();
            d.exit();
          },
          dsn,
        });
        d.run(() => {
          getDefaultHub().bindClient(client);
          expect(getDefaultHub().getClient()).toBe(client);
          getDefaultHub().captureEvent({ message: 'test' });
        });
      }));
  });
});
