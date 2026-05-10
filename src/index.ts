/**
 * ManagerCMS SDK - TypeScript Client
 * @packageDocumentation
 */

import type { ITokenStore } from './stores/TokenStore';
import { MemoryTokenStore, LocalStorageTokenStore } from './stores/TokenStore';
import { ContentService } from './services/ContentService';
import { SettingsService } from './services/SettingsService';
import { ManagerCMSError, NotFoundError, UnauthorizedError, ValidationError, ServerError } from './errors/ManagerCMSError';
import type { Hooks } from './stores/Hooks';
import { HooksManager } from './stores/Hooks';
import { CacheStore } from './stores/CacheStore';

const DEFAULT_API_URL = 'https://api.manager.1bits.site';
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const DEFAULT_CACHE_TTL = 300;

export { ManagerCMSError, NotFoundError, UnauthorizedError, ValidationError, ServerError } from './errors/ManagerCMSError';
export { MemoryTokenStore, LocalStorageTokenStore } from './stores/TokenStore';
export type { ITokenStore } from './stores/TokenStore';
export { ContentService } from './services/ContentService';
export { SettingsService } from './services/SettingsService';
export type { Hooks } from './stores/Hooks';
export { CacheStore } from './stores/CacheStore';
export type {
  Website,
  ContentType,
  Entry,
  GetEntriesOptions,
  PaginatedResponse,
  APIInfo,
  Stats,
  HealthCheckResponse,
  CreateEntryData,
  UpdateEntryData,
} from './models/types';

/**
 * Configuración del cliente ManagerCMS
 */
export interface ManagerCMSConfig {
  /** URL base del API de ManagerCMS (opcional, valor por defecto: https://api.manager.1bits.site) */
  apiUrl?: string;
  /** Token de autenticación (opcional si se usa tokenStore) */
  token?: string;
  /** Función fetch personalizada */
  fetch?: typeof fetch;
  /** Almacenamiento de token personalizado */
  tokenStore?: ITokenStore;
  /** Tamaño de página por defecto para paginación */
  defaultPageSize?: number;
  /** Timeout de requests en ms */
  timeout?: number;
  /** Número de reintentos automáticos */
  retries?: number;
  /** Habilitar cache en memoria */
  cacheEnabled?: boolean;
  /** TTL del cache en segundos */
  cacheTTL?: number;
  /** Hooks para interceptar requests/responses */
  hooks?: Hooks;
}

/**
 * Cliente principal de ManagerCMS
 * Proporciona acceso a todos los servicios del CMS
 *
 * @example
 * ```typescript
 * import { ManagerCMS } from '@managercms/sdk';
 *
 * // Sin especificar URL (usa la URL por defecto)
 * const cms = new ManagerCMS({
 *   token: 'tu-token'
 * });
 *
 * const entries = await cms.getEntries('blog');
 * ```
 *
 * @example
 * ```typescript
 * // Configuración completa con cache y hooks
 * const cms = new ManagerCMS({
 *   token: 'tu-token',
 *   cacheEnabled: true,
 *   cacheTTL: 300,
 *   defaultPageSize: 20,
 *   timeout: 30000,
 *   retries: 3,
 *   hooks: {
 *     onRequest: (url, options) => console.log(`Request: ${url}`),
 *     onResponse: (response) => console.log(`Status: ${response.status}`),
 *     onError: (error) => console.error(`Error: ${error.message}`)
 *   }
 * });
 * ```
 */
export class ManagerCMS {
  /** Servicio de contenido para CRUD de entradas */
  public content: ContentService;
  /** Servicio de configuración y metadatos */
  public settings: SettingsService;
  private tokenStore: ITokenStore;
  private cache: CacheStore | null = null;
  private hooksManager: HooksManager;
  private config: ManagerCMSConfig;

  /**
   * Crea una nueva instancia del cliente ManagerCMS
   * @param config - Configuración del cliente
   */
  constructor(config: ManagerCMSConfig) {
    this.config = config;
    const apiUrl = (config.apiUrl || DEFAULT_API_URL).replace(/\/$/, '');

    if (config.tokenStore) {
      this.tokenStore = config.tokenStore;
    } else {
      this.tokenStore = new MemoryTokenStore();
      if (config.token) {
        this.tokenStore.setToken(config.token);
      }
    }

    this.hooksManager = new HooksManager(config.hooks);

    if (config.cacheEnabled) {
      const ttl = (config.cacheTTL || DEFAULT_CACHE_TTL) * 1000;
      this.cache = new CacheStore(ttl);
    }

    const fetchFn = config.fetch || fetch;

    this.content = new ContentService(
      apiUrl,
      this.tokenStore,
      fetchFn,
      this.cache,
      this.hooksManager,
      {
        timeout: config.timeout || DEFAULT_TIMEOUT,
        retries: config.retries || DEFAULT_RETRIES,
        defaultPageSize: config.defaultPageSize || DEFAULT_PAGE_SIZE,
      }
    );
    this.settings = new SettingsService(
      apiUrl,
      this.tokenStore,
      fetchFn,
      this.cache,
      this.hooksManager,
      {
        timeout: config.timeout || DEFAULT_TIMEOUT,
        retries: config.retries || DEFAULT_RETRIES,
      }
    );
  }

  /**
   * Establece un nuevo token de autenticación
   * @param token - Nuevo token
   */
  setToken(token: string): void {
    this.tokenStore.setToken(token);
  }

  /**
   * Limpia el token de autenticación actual
   */
  clearToken(): void {
    this.tokenStore.clearToken();
  }

  /**
   * Verifica el estado del servicio (sin autenticación)
   */
  async healthCheck() {
    return this.settings.healthCheck();
  }

  /**
   * Obtiene información del API
   */
  async getAPIInfo() {
    return this.settings.getAPIInfo();
  }

  /**
   * Obtiene estadísticas del CMS (requiere autenticación)
   */
  async getStats() {
    return this.settings.getStats();
  }

  /**
   * Obtiene información del website (requiere autenticación)
   */
  async getWebsite() {
    return this.settings.getWebsite();
  }

  /**
   * Obtiene todos los tipos de contenido (requiere autenticación)
   */
  async getContentTypes() {
    return this.settings.getContentTypes();
  }

  /**
   * Obtiene entradas de un tipo de contenido
   * @param contentType - Identificador del tipo de contenido
   * @param options - Opciones de paginación y filtrado
   */
  async getEntries(contentType: string, options?: Parameters<typeof this.content.getEntries>[1]) {
    return this.content.getEntries(contentType, options);
  }

  /**
   * Obtiene una entrada específica
   * @param contentType - Identificador del tipo de contenido
   * @param id - ID de la entrada
   */
  async getEntry(contentType: string, id: number | string) {
    return this.content.getEntry(contentType, id);
  }

  /**
   * Crea una nueva entrada
   * @param contentType - Identificador del tipo de contenido
   * @param data - Datos de la entrada
   */
  async createEntry<T = any>(contentType: string, data: any) {
    return this.content.createEntry<T>(contentType, data);
  }

  /**
   * Actualiza una entrada existente
   * @param contentType - Identificador del tipo de contenido
   * @param id - ID de la entrada
   * @param data - Datos a actualizar
   */
  async updateEntry<T = any>(contentType: string, id: number | string, data: any) {
    return this.content.updateEntry<T>(contentType, id, data);
  }

  /**
   * Elimina una entrada
   * @param contentType - Identificador del tipo de contenido
   * @param id - ID de la entrada
   */
  async deleteEntry(contentType: string, id: number | string) {
    return this.content.deleteEntry(contentType, id);
  }
}