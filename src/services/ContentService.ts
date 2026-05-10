import type {
  Entry,
  GetEntriesOptions,
  PaginatedResponse,
  CreateEntryData,
  UpdateEntryData,
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
        const token = this.tokenStore.getToken();
        if (!token) {
          const error = new UnauthorizedError('No authentication token available', { url });
          this.hooksManager.onError(error, url);
          throw error;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        const response = await this.fetchFn(url, {
          ...options,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
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

        if (response.status === 204) {
          return {} as T;
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
    const usePagination = options.pageSize || options.page;
    const baseUrl = usePagination
      ? `/websites/paginacion/content/${modelSlug}/entries/`
      : `/websites/content/${modelSlug}/entries/`;

    const endpoint = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    return this.request<PaginatedResponse<Entry>>(endpoint, {}, !options.page);
  }

  async getEntry(modelSlug: string, id: number | string): Promise<Entry> {
    return this.request<Entry>(`/websites/content/${modelSlug}/entries/${id}/`);
  }

  async createEntry<T = Entry>(modelSlug: string, data: CreateEntryData): Promise<T> {
    return this.request<T>(`/websites/content/${modelSlug}/entries/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEntry<T = Entry>(
    modelSlug: string,
    id: number | string,
    data: UpdateEntryData
  ): Promise<T> {
    return this.request<T>(`/websites/content/${modelSlug}/entries/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEntry(modelSlug: string, id: number | string): Promise<void> {
    return this.request<void>(`/websites/content/${modelSlug}/entries/${id}/`, {
      method: 'DELETE',
    });
  }

  clearCache(): void {
    this.cache?.clear();
  }
}