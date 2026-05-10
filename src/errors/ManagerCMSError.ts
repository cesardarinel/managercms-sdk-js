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

export class NotFoundError extends ManagerCMSError {
  constructor(message: string = 'Resource not found', options?: { url?: string; data?: any }) {
    super(404, message, options);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ManagerCMSError {
  constructor(message: string = 'Unauthorized', options?: { url?: string; data?: any }) {
    super(401, message, options);
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends ManagerCMSError {
  constructor(message: string = 'Validation failed', options?: { url?: string; data?: any }) {
    super(400, message, options);
    this.name = 'ValidationError';
  }
}

export class ServerError extends ManagerCMSError {
  constructor(message: string = 'Internal server error', options?: { url?: string; data?: any }) {
    super(500, message, options);
    this.name = 'ServerError';
  }
}