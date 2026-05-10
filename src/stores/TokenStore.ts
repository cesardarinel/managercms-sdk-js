export interface ITokenStore {
  getToken(): string | null;
  setToken(token: string): void;
  clearToken(): void;
}

export class MemoryTokenStore implements ITokenStore {
  private token: string | null = null;

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
  }
}

export class LocalStorageTokenStore implements ITokenStore {
  private key: string;

  constructor(key: string = 'managercms_token') {
    this.key = key;
  }

  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(this.key);
  }

  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.key, token);
    }
  }

  clearToken(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.key);
    }
  }
}