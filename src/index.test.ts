import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ManagerCMS, ManagerCMSError } from './index';

vi.stubGlobal('fetch', vi.fn());

describe('ManagerCMS SDK', () => {
  const defaultUrl = 'https://manager.1bits.site';
  const token = 'mi-token-secreto';
  let sdk: ManagerCMS;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuración', () => {
    it('debería inicializarse con token en objeto config', () => {
      sdk = new ManagerCMS({ apiUrl: defaultUrl, token });
      expect(sdk).toBeDefined();
    });

    it('debería permitir configurar fetch personalizado', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      sdk = new ManagerCMS({
        apiUrl: defaultUrl,
        token,
        fetch: customFetch,
      });

      await sdk.getWebsite();

      expect(customFetch).toHaveBeenCalled();
    });

    it('debería permitir configurar custom tokenStore', () => {
      const customStore = {
        getToken: () => 'custom-token',
        setToken: vi.fn(),
        clearToken: vi.fn(),
      };

      sdk = new ManagerCMS({
        apiUrl: defaultUrl,
        tokenStore: customStore as any,
      });

      expect(customStore.getToken()).toBe('custom-token');
    });
  });

  describe('SettingsService - Endpoints Públicos', () => {
    beforeEach(() => {
      sdk = new ManagerCMS({ apiUrl: defaultUrl, token });
    });

    it('healthCheck debería retornar estado ok', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', env: 'production' }),
      });

      const result = await sdk.healthCheck();

      expect(result.status).toBe('ok');
      expect(fetch).toHaveBeenCalledWith(
        `${defaultUrl}/health/`,
        expect.any(Object)
      );
    });

    it('getAPIInfo debería retornar información del API', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          name: 'ManagerCMS API',
          version: '1.0',
          environment: 'production',
          endpoints: { content: '/content/' },
        }),
      });

      const result = await sdk.getAPIInfo();

      expect(result.name).toBe('ManagerCMS API');
    });

    it('getStats debería requerir autenticación', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ websites: 1, content_types: 5, entries: 100 }),
      });

      const result = await sdk.getStats();

      expect(result.entries).toBe(100);
      expect(fetch).toHaveBeenCalledWith(
        `${defaultUrl}/stats/`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
        })
      );
    });
  });

  describe('SettingsService - Endpoints Protegidos', () => {
    beforeEach(() => {
      sdk = new ManagerCMS({ apiUrl: defaultUrl, token });
    });

    it('getWebsite debería retornar información del website', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, name: 'Mi Sitio', domain: 'ejemplo.com' }),
      });

      const result = await sdk.getWebsite();

      expect(result.name).toBe('Mi Sitio');
    });

    it('getContentTypes debería retornar tipos de contenido', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 1, name: 'Blog', slug: 'blog', api_identifier: 'blog' },
          { id: 2, name: 'Productos', slug: 'productos', api_identifier: 'productos' },
        ],
      });

      const result = await sdk.getContentTypes();

      expect(result).toHaveLength(2);
      expect(result[0].api_identifier).toBe('blog');
    });
  });

  describe('ContentService', () => {
    beforeEach(() => {
      sdk = new ManagerCMS({ apiUrl: defaultUrl, token });
    });

    it('getEntries debería retornar entradas paginadas', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          count: 50,
          results: [
            { id: 1, data: '{}', status: 'published', created_at: '2024-01-01', updated_at: '2024-01-01' },
          ],
        }),
      });

      const result = await sdk.getEntries('blog', { page: 1, pageSize: 10 });

      expect(result.count).toBe(50);
      expect(result.results).toHaveLength(1);
    });

    it('getEntry debería retornar una entrada específica', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 123,
          data: '{"title": "Hello"}',
          status: 'published',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        }),
      });

      const result = await sdk.getEntry('blog', 123);

      expect(result.id).toBe(123);
    });

    it('createEntry debería crear una nueva entrada', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 456,
          data: '{"title": "Nuevo Post"}',
          status: 'draft',
          created_at: '2024-01-02',
          updated_at: '2024-01-02',
        }),
      });

      const result = await sdk.createEntry('blog', {
        data: { title: 'Nuevo Post' },
        status: 'draft',
      });

      expect(fetch).toHaveBeenCalledWith(
        `${defaultUrl}/websites/content/blog/entries/`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('updateEntry debería actualizar una entrada existente', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await sdk.updateEntry('blog', 123, { data: { title: 'Actualizado' } });

      expect(fetch).toHaveBeenCalledWith(
        `${defaultUrl}/websites/content/blog/entries/123/`,
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('deleteEntry debería eliminar una entrada', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => ({}),
      });

      await sdk.deleteEntry('blog', 123);

      expect(fetch).toHaveBeenCalledWith(
        `${defaultUrl}/websites/content/blog/entries/123/`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Manejo de Errores', () => {
    beforeEach(() => {
      sdk = new ManagerCMS({ apiUrl: defaultUrl, token });
    });

    it('debería lanzar ManagerCMSError con metadatos completos', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ detail: 'No encontrado' }),
      });

      try {
        await sdk.getWebsite();
        throw new Error('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ManagerCMSError);
        const cmsError = error as ManagerCMSError;
        expect(cmsError.status).toBe(404);
        expect(cmsError.url).toContain('/websites/');
        expect(cmsError.data).toEqual({ detail: 'No encontrado' });
      }
    });

    it('debería tener método toJSON para logs', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      try {
        await sdk.getWebsite();
      } catch (error) {
        const json = (error as ManagerCMSError).toJSON();
        expect(['ManagerCMSError', 'ServerError']).toContain(json.name);
        expect(json.status).toBe(500);
        expect(json.url).toBeDefined();
      }
    });

    it('debería manejar error cuando no hay token', async () => {
      const sdkWithoutToken = new ManagerCMS({ apiUrl: defaultUrl });

      await expect(sdkWithoutToken.getEntries('blog')).rejects.toThrow(
        'No authentication token available'
      );
    });
  });

  describe('Token Management', () => {
    it('setToken debería actualizar el token', async () => {
      sdk = new ManagerCMS({ apiUrl: defaultUrl });

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      sdk.setToken(token);
      await sdk.getWebsite();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
        })
      );
    });

    it('clearToken debería limpiar el token', async () => {
      sdk = new ManagerCMS({ apiUrl: defaultUrl, token });
      sdk.clearToken();

      await expect(sdk.getEntries('blog')).rejects.toThrow(
        'No authentication token available'
      );
    });
  });
});