import type { Website, ContentType, APIInfo, Stats, HealthCheckResponse } from '../models/types';
import { ManagerCMSError } from '../models/ManagerCMSError';
import type { ITokenStore } from '../stores/TokenStore';

export class SettingsService {
  constructor(
    private apiUrl: string,
    private tokenStore: ITokenStore,
    private fetchFn: typeof fetch = fetch
  ) {}

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await this.fetchFn(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
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
        data: errorData,
      });
    }

    return response.json();
  }

  private async authenticatedRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.tokenStore.getToken();
    if (!token) {
      throw new ManagerCMSError(401, 'No authentication token available', {
        url: `${this.apiUrl}${endpoint}`,
      });
    }

    return this.request<T>(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/health/');
  }

  async getAPIInfo(): Promise<APIInfo> {
    return this.request<APIInfo>('/');
  }

  async getStats(): Promise<Stats> {
    return this.authenticatedRequest<Stats>('/stats/');
  }

  async getWebsite(): Promise<Website> {
    return this.authenticatedRequest<Website>('/websites/');
  }

  async getContentTypes(): Promise<ContentType[]> {
    return this.authenticatedRequest<ContentType[]>('/websites/content-types/');
  }
}