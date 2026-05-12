export interface Website {
  id: number;
  name: string;
  domain: string;
}

export interface ContentType {
  id: number;
  name: string;
  slug: string;
  api_identifier: string;
}

export interface Entry {
  id: number;
  created_at: string;
  updated_at: string;
  data: string;
  status: 'draft' | 'published' | 'archived';
}

export interface GetEntriesOptions {
  pageSize?: number;
  page?: number;
  filters?: Record<string, string | number | boolean>;
  ordering?: string;
  search?: string;
  status?: 'draft' | 'published' | 'archived';
  createdAfter?: string;
  createdBefore?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

export interface APIInfo {
  name: string;
  version: string;
  environment: string;
  endpoints: Record<string, string>;
}

export interface Stats {
  websites: number;
  content_types: number;
  entries: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  env: string;
}

export interface CreateEntryData {
  data: Record<string, any>;
  status?: 'draft' | 'published';
}

export interface UpdateEntryData {
  data?: Record<string, any>;
  status?: 'draft' | 'published' | 'archived';
}