import type {
  Entry,
  GetEntriesOptions,
  PaginatedResponse,
  CreateEntryData,
  UpdateEntryData,
} from '../models/types';
import { ManagerCMSError } from '../models/ManagerCMSError';
import type { ITokenStore } from '../stores/TokenStore';

export class ContentService {
  constructor(
    private apiUrl: string,
    private tokenStore: ITokenStore,
    private fetchFn: typeof fetch = fetch
  ) {}

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.tokenStore.getToken();
    if (!token) {
      throw new ManagerCMSError(401, 'No authentication token available', {
        url: `${this.apiUrl}${endpoint}`,
      });
    }

    const response = await this.fetchFn(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      throw new ManagerCMSError(response.status, `Error: ${response.statusText}`, {
        url: `${this.apiUrl}${endpoint}`,
        originalError: null,
        data: errorData,
      });
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async getEntries(
    modelSlug: string,
    options: GetEntriesOptions = {}
  ): Promise<PaginatedResponse<Entry>> {
    const params = new URLSearchParams();

    if (options.pageSize) params.append('page_size', options.pageSize.toString());
    if (options.page) params.append('page', options.page.toString());
    if (options.ordering) params.append('ordering', options.ordering);
    if (options.search) params.append('search', options.search);

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

    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    return this.request<PaginatedResponse<Entry>>(url);
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
}