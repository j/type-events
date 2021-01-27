import { Loggable } from '../interfaces';

/**
 * The default logger when one isn't configured.
 */
export class Logger implements Loggable {
  log(...data: any[]) {
    console.log(...data);
  }

  error(message?: any, ...optionalParams: any[]): void {
    console.error(message, ...optionalParams);
  }
}
