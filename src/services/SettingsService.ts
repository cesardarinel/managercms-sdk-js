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
      if (cached) {
        return cached;
      }
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        const response = await this.fetchFn(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        this.hooksManager.onResponse(response);

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = null;
          }

          let error: ManagerCMSError;
          if (response.status === 404) {
            error = new NotFoundError(`Error: ${response.statusText}`, { url, data: errorData });
          } else if (response.status === 401) {
            error = new UnauthorizedError(`Error: ${response.statusText}`, { url, data: errorData });
          } else if (response.status === 400) {
            error = new ValidationError(`Error: ${response.statusText}`, { url, data: errorData });
          } else if (response.status >= 500) {
            error = new ServerError(`Error: ${response.statusText}`, { url, data: errorData });
          } else {
            error = new ManagerCMSError(response.status, `Error: ${response.statusText}`, {
              url,
              originalError: null,
              data: errorData,
            });
          }
          this.hooksManager.onError(error, url);
          throw error;
        }

        const data = await response.json();

        if (useCache && this.cache) {
          this.cache.set(endpoint, data);
        }

        return data;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.options.retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    if (lastError) {
      this.hooksManager.onError(lastError, url);
      throw lastError;
    }
    throw new ManagerCMSError(0, 'Request failed', { url });
  }

  private async authenticatedRequest<T>(endpoint: string, options: RequestInit = {}, useCache: boolean = false): Promise<T> {
    const token = this.tokenStore.getToken();
    if (!token) {
      const error = new UnauthorizedError('No authentication token available', { url: `${this.apiUrl}${endpoint}` });
      this.hooksManager.onError(error, `${this.apiUrl}${endpoint}`);
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
    return this.request<APIInfo>('/', {}, true);
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