export abstract class Event {
  private _isPropagationStopped: boolean = false;

  stopPropagation(): void {
    this._isPropagationStopped = true;
  }

  isPropagationStopped(): boolean {
    return this._isPropagationStopped;
  }
}
