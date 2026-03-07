export class ManagerCMSError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ManagerCMSError';
  }
}

export interface WebsiteInfo {
  id: number;
  name: string;
  domain: string;
}

export interface ContentType {
  id: number;
  name: string;
  slug: string;
}

export interface Entry {
  id: number;
  created_at: string;
  updated_at: string;
  data: Record<string, any>;
}

export interface GetEntriesOptions {
  pageSize?: number;
  page?: number;
  filters?: Record<string, string | number | boolean>;
  ordering?: string;
  search?: string;
}

export class ManagerCMS {
  private apiUrl: string;
  private token: string;

  constructor(token: string, apiUrl: string = 'https://manager.1bits.site') {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      throw new ManagerCMSError(
        response.status, 
        `Error en la API de ManagerCMS: ${response.statusText}`,
        errorData
      );
    }
    return response.json();
  }

  // --- Endpoints de Delivery ---

  async getWebsiteInfo(): Promise<WebsiteInfo> {
    return this.request<WebsiteInfo>('/websites/');
  }

  async getContentTypes(): Promise<ContentType[]> {
    return this.request<ContentType[]>('/websites/content-types/');
  }

  async getEntries<T = Entry>(modelSlug: string, options: GetEntriesOptions = {}): Promise<T[]> {
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
    const baseUrl = options.pageSize || options.page
      ? `/websites/paginacion/content/${modelSlug}/entries/`
      : `/websites/content/${modelSlug}/entries/`;

    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    return this.request<T[]>(url);
  }

  async getEntry<T = Entry>(modelSlug: string, id: number | string): Promise<T> {
    return this.request<T>(`/websites/content/${modelSlug}/entries/${id}/`);
  }

  // --- Management API ---

  async createEntry<T = Entry>(modelSlug: string, data: any): Promise<T> {
    return this.request<T>(`/websites/content/${modelSlug}/entries/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEntry<T = Entry>(modelSlug: string, id: number | string, data: any): Promise<T> {
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