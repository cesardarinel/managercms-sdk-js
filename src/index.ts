/**
 * ManagerCMS SDK - TypeScript Client
 * @packageDocumentation
 */

import type { ITokenStore } from './stores/TokenStore';
import { MemoryTokenStore, LocalStorageTokenStore } from './stores/TokenStore';
import { ContentService } from './services/ContentService';
import { SettingsService } from './services/SettingsService';
import { ManagerCMSError } from './models/ManagerCMSError';

const DEFAULT_API_URL = 'https://api.manager.1bits.site';

export { ManagerCMSError } from './models/ManagerCMSError';
export { MemoryTokenStore, LocalStorageTokenStore } from './stores/TokenStore';
export type { ITokenStore } from './stores/TokenStore';
export { ContentService } from './services/ContentService';
export { SettingsService } from './services/SettingsService';
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
 * // Especificar URL personalizada si es necesario
 * const cms = new ManagerCMS({
 *   apiUrl: 'https://api.custom-domain.com',
 *   token: 'tu-token'
 * });
 * ```
 */
export class ManagerCMS {
  /** Servicio de contenido para CRUD de entradas */
  public content: ContentService;
  /** Servicio de configuración y metadatos */
  public settings: SettingsService;
  private tokenStore: ITokenStore;

  /**
   * Crea una nueva instancia del cliente ManagerCMS
   * @param config - Configuración del cliente
   */
  constructor(config: ManagerCMSConfig) {
    const apiUrl = (config.apiUrl || DEFAULT_API_URL).replace(/\/$/, '');

    if (config.tokenStore) {
      this.tokenStore = config.tokenStore;
    } else {
      this.tokenStore = new MemoryTokenStore();
      if (config.token) {
        this.tokenStore.setToken(config.token);
      }
    }

    const fetchFn = config.fetch || fetch;

    this.content = new ContentService(apiUrl, this.tokenStore, fetchFn);
    this.settings = new SettingsService(apiUrl, this.tokenStore, fetchFn);
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