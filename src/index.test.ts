import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManagerCMS, ManagerCMSError } from './index';

// Simulamos el fetch global
global.fetch = vi.fn();

describe('ManagerCMS SDK', () => {
  const defaultUrl = 'https://manager.1bits.site';
  const token = 'mi-token-secreto';
  let sdk: ManagerCMS;

  beforeEach(() => {
    sdk = new ManagerCMS(token);
    vi.clearAllMocks();
  });

  it('debería inicializarse con la URL fija por defecto', () => {
    // @ts-ignore
    expect(sdk.apiUrl).toBe(defaultUrl);
  });

  it('debería permitir sobrescribir la URL si es necesario', () => {
    const customSdk = new ManagerCMS(token, 'https://otro-manager.com');
    // @ts-ignore
    expect(customSdk.apiUrl).toBe('https://otro-manager.com');
  });

  it('debería llamar a getWebsiteInfo con la URL fija', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    await sdk.getWebsiteInfo();

    expect(fetch).toHaveBeenCalledWith(
      `${defaultUrl}/websites/`,
      expect.anything()
    );
  });

  it('debería manejar errores de la API correctamente', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ detail: 'No encontrado' })
    });

    await expect(sdk.getWebsiteInfo()).rejects.toThrow(ManagerCMSError);
  });
});
