export type RequestHook = (url: string, options: RequestInit) => void;
export type ResponseHook = (response: Response, data?: any) => void;
export type ErrorHook = (error: Error, url?: string) => void;

export interface Hooks {
  onRequest?: RequestHook;
  onResponse?: ResponseHook;
  onError?: ErrorHook;
}

export class HooksManager {
  private hooks: Hooks;

  constructor(hooks: Hooks = {}) {
    this.hooks = hooks;
  }

  setHooks(hooks: Hooks): void {
    this.hooks = hooks;
  }

  onRequest(url: string, options: RequestInit): void {
    this.hooks.onRequest?.(url, options);
  }

  onResponse(response: Response, data?: any): void {
    this.hooks.onResponse?.(response, data);
  }

  onError(error: Error, url?: string): void {
    this.hooks.onError?.(error, url);
  }
}