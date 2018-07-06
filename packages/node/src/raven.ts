import { Breadcrumb, SentryEvent } from '@sentry/types';
import * as RavenNode from 'raven';

export type SendMethod = (event: SentryEvent, cb?: (err: any) => void) => void;

/** Provides access to internal raven functionality. */
export interface RavenInternal {
  captureBreadcrumb(breadcrumb: Breadcrumb): void;
  captureException(exception: any, cb?: (event: SentryEvent) => void): void;
  captureMessage(message: string, cb?: (event: SentryEvent) => void): void;
  config(dsn: string, options: object): RavenInternal;
  install(onFatalError?: (error: Error) => void): void;
  send: SendMethod;
  version: string;
  installed: boolean;
}

/** Casted raven instance with access to internal functions. */
// tslint:disable-next-line:variable-name
export const Raven: RavenInternal = RavenNode as any;
