import type {
  Entry,
  GetEntriesOptions,
  PaginatedResponse,
} from '../models/types';
import { ManagerCMSError, NotFoundError, UnauthorizedError, ValidationError, ServerError } from '../errors/ManagerCMSError';
import type { ITokenStore } from '../stores/TokenStore';
import type { CacheStore } from '../stores/CacheStore';
import { HooksManager } from '../stores/Hooks';

interface ServiceOptions {
  timeout: number;
  retries: number;
  defaultPageSize: number;
}

export class ContentService {
  constructor(
    private apiUrl: string,
    private tokenStore: ITokenStore,
    private fetchFn: typeof fetch = fetch,
    private cache: CacheStore | null = null,
    private hooksManager: HooksManager = new HooksManager(),
    private options: ServiceOptions = { timeout: 30000, retries: 3, defaultPageSize: 10 }
  ) {}

  private async request<T>(endpoint: string, options: RequestInit = {}, useCache: boolean = false): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiUrl}${endpoint}`;
    
    // Hooks no bloqueantes
    this.hooksManager.onRequest(url, options);

    if (useCache && this.cache) {
      const cached = this.cache.get<T>(endpoint);
      if (cached) return cached;
    }

    const token = this.tokenStore.getToken();
    if (!token) {
      throw new UnauthorizedError('No authentication token available', { url });
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
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

        if (response.status === 204) return {} as T;

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
    let data = null;
    let message = `Error: ${response.statusText}`;

    try {
      if (response.headers.get('content-type')?.includes('application/json')) {
        data = await response.json();
        if (data.message) message = data.message;
        else if (data.error) message = data.error;
      }
    } catch {
      // Ignoramos errores de parseo
    }

    if (status === 404) return new NotFoundError(message, { url, data });
    if (status === 401) return new UnauthorizedError(message, { url, data });
    if (status === 400) return new ValidationError(message, { url, data });
    if (status >= 500) return new ServerError(message, { url, data });

    return new ManagerCMSError(status, message, { url, data, originalError: null });
  }

  async getEntries(
    modelSlug: string,
    options: GetEntriesOptions = {}
  ): Promise<PaginatedResponse<Entry>> {
    const params = new URLSearchParams();
    const pageSize = options.pageSize || this.options.defaultPageSize;

    params.append('page_size', pageSize.toString());
    if (options.page) params.append('page', options.page.toString());
    if (options.ordering) params.append('ordering', options.ordering);
    if (options.search) params.append('search', options.search);
    if (options.status) params.append('status', options.status);
    if (options.createdAfter) params.append('created_after', options.createdAfter);
    if (options.createdBefore) params.append('created_before', options.createdBefore);

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        params.append(key, value.toString());
      });
    }

    const queryString = params.toString();
    const endpoint = `/api/v1/content/${modelSlug}${queryString ? `?${queryString}` : ''}`;
    return this.request<PaginatedResponse<Entry>>(endpoint, {}, !options.page);
  }

  async getEntry(modelSlug: string, id: number | string): Promise<Entry> {
    return this.request<Entry>(`/api/v1/content/${modelSlug}/${id}/`);
  }

  clearCache(): void {
    this.cache?.clear();
  }
}