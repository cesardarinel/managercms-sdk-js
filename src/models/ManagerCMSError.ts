export class ManagerCMSError extends Error {
  public status: number;
  public url: string;
  public originalError: Error | null;
  public data: any;

  constructor(
    status: number,
    message: string,
    options?: {
      url?: string;
      originalError?: Error | null;
      data?: any;
    }
  ) {
    super(message);
    this.name = 'ManagerCMSError';
    this.status = status;
    this.url = options?.url || '';
    this.originalError = options?.originalError || null;
    this.data = options?.data;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ManagerCMSError);
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      url: this.url,
      data: this.data,
      stack: this.stack,
    };
  }
}