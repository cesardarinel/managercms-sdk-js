import type { Website, ContentType, APIInfo, Stats, HealthCheckResponse } from '../models/types';
import { ManagerCMSError, NotFoundError, UnauthorizedError, ValidationError, ServerError } from '../errors/ManagerCMSError';
import type { ITokenStore } from '../stores/TokenStore';
import type { CacheStore } from '../stores/CacheStore';
import { HooksManager } from '../stores/Hooks';

interface ServiceOptions {
  timeout: number;
  retries: number;
}

export class SettingsService {
  constructor(
    private apiUrl: string,
    private tokenStore: ITokenStore,
    private fetchFn: typeof fetch = fetch,
    private cache: CacheStore | null = null,
    private hooksManager: HooksManager = new HooksManager(),
    private options: ServiceOptions = { timeout: 30000, retries: 3 }
  ) {}

  private async request<T>(endpoint: string, options: RequestInit = {}, useCache: boolean = false): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    this.hooksManager.onRequest(url, options);

    if (useCache && this.cache) {
      const cached = this.cache.get<T>(endpoint);
      if (cached) return cached;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (options.headers) Object.assign(headers, options.headers);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

      try {
        const response = await this.fetchFn(url, {
          ...options,
          signal: controller.signal,
          headers
        });

        clearTimeout(timeoutId);
        this.hooksManager.onResponse(response);

        if (!response.ok) {
          const error = await this.createError(response, url);
          this.hooksManager.onError(error, url);
          throw error;
        }

        const data = await response.json();
        if (useCache && this.cache) this.cache.set(endpoint, data);

        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;

        if (error instanceof ManagerCMSError && error.status < 500 && error.status !== 0) {
          throw error;
        }

        if (attempt < this.options.retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 50));
        }
      }
    }

    throw lastError || new ManagerCMSError(0, 'Request failed', { url });
  }

  private async createError(response: Response, url: string): Promise<ManagerCMSError> {
    const status = response.status;
    const message = `Error: ${response.statusText}`;
    let data = null;

    try {
      if (response.headers.get('content-type')?.includes('application/json')) {
        data = await response.json();
      }
    } catch {
      // Ignore
    }
    
    if (status === 404) return new NotFoundError(message, { url, data });
    if (status === 401) return new UnauthorizedError(message, { url, data });
    if (status === 400) return new ValidationError(message, { url, data });
    if (status >= 500) return new ServerError(message, { url, data });
    
    return new ManagerCMSError(status, message, { url, data, originalError: null });
  }

  private async authenticatedRequest<T>(endpoint: string, options: RequestInit = {}, useCache: boolean = false): Promise<T> {
    const token = this.tokenStore.getToken();
    if (!token) {
      const url = `${this.apiUrl}${endpoint}`;
      const error = new UnauthorizedError('No authentication token available', { url });
      this.hooksManager.onError(error, url);
      throw error;
    }

    return this.request<T>(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    }, useCache);
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/health/', {}, true);
  }

  async getAPIInfo(): Promise<APIInfo> {
    return this.request<APIInfo>('/info/', {}, true);
  }

  async getStats(): Promise<Stats> {
    return this.authenticatedRequest<Stats>('/stats/');
  }

  async getWebsite(): Promise<Website> {
    return this.authenticatedRequest<Website>('/websites/', {}, true);
  }

  async getContentTypes(): Promise<ContentType[]> {
    return this.authenticatedRequest<ContentType[]>('/websites/content-types/', {}, true);
  }

  clearCache(): void {
    this.cache?.clear();
  }
}