# ManagerCMS SDK - TypeScript

## 📦 Instalación

```bash
npm install @managercms/sdk
# o
pnpm add @managercms/sdk
```

## ⚡ Uso Básico

### Inicialización

```typescript
import { ManagerCMS } from '@managercms/sdk';

const cms = new ManagerCMS({
  token: import.meta.env.PRIVATE_API_TOKEN,
});
```

### Configuración Avanzada

```typescript
import { ManagerCMS, MemoryTokenStore, LocalStorageTokenStore } from '@managercms/sdk';

// Configuración básica
const cms = new ManagerCMS({
  token: 'tu-token',
});

// Con fetch personalizado (útil para testing o wrappers)
const customFetch = async (url, options) => {
  console.log(`Request to: ${url}`);
  return fetch(url, options);
};

const cmsWithFetch = new ManagerCMS({
  token: 'tu-token',
  fetch: customFetch,
});

// Con tokenStore personalizado (persistencia)
const tokenStore = new LocalStorageTokenStore('my_token_key');
const cmsWithStore = new ManagerCMS({
  tokenStore,
});

// Gestión de token en tiempo de ejecución
cms.setToken('nuevo-token');  // Actualizar token
cms.clearToken();             // Limpiar token
```

### Endpoints Públicos (sin autenticación)

```typescript
// Health check
await cms.healthCheck();
// → { status: "ok", env: "production" }

// Información del API
await cms.getAPIInfo();
// → { name, version, environment, endpoints }

// Estadísticas
await cms.getStats();
// → { websites, content_types, entries }
```

### Endpoints Protegidos (requieren token)

```typescript
// Información del website
await cms.getWebsite();
// → { id: 1, name: "Mi Sitio", domain: "ejemplo.com" }

// Tipos de contenido
await cms.getContentTypes();
// → [{ id: 1, name: "Blog", api_identifier: "blog" }]

// Entradas (todas)
await cms.getEntries('blog');
// → [{ id, data, status, created_at, updated_at }]

// Entradas con paginación
await cms.getEntries('blog', { page: 1, pageSize: 10 });
// → { count: 50, results: [...] }

// Una entrada específica
await cms.getEntry('blog', 123);
// → { id: 123, data: "...", status: "published", ... }
```

## 🎯 Ejemplos para Astro

### 1. Client-Side Component (React/Preact)

```tsx
// src/components/BlogList.tsx
import { useState, useEffect } from 'react';
import { ManagerCMS } from '@managercms/sdk';

interface Props {
  token: string;
  contentType?: string;
}

export default function BlogList({ token, contentType = 'blog' }: Props) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const cms = new ManagerCMS({ token });

  useEffect(() => {
    loadPosts();
  }, [contentType, page]);

  async function loadPosts() {
    try {
      setLoading(true);
      const result = await cms.getEntries(contentType, { page, pageSize: 10 });
      setPosts(result.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div class="blog-list">
      {posts.map((post) => {
        const data = JSON.parse(post.data);
        return (
          <article key={post.id}>
            <h2>{data.title || 'Sin título'}</h2>
            <p>{data.excerpt || ''}</p>
            <time>{new Date(post.created_at).toLocaleDateString()}</time>
          </article>
        );
      })}

      <nav class="pagination">
        <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
          Anterior
        </button>
        <span>Página {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={posts.length < 10}>
          Siguiente
        </button>
      </nav>
    </div>
  );
}
```

**Uso en Astro:**

```astro
---
// src/pages/blog.astro
import BlogList from '../components/BlogList';
---

<BlogList 
  client:load 
  token={import.meta.env.PRIVATE_API_TOKEN}
  contentType="blog"
/>
```

### 2. Server-Side (SSG/SSR)

```typescript
// src/lib/cms.ts
import { ManagerCMS } from '@managercms/sdk';

export function createCMS(token: string) {
  return new ManagerCMS({
    token,
  });
}

export type CMS = ReturnType<typeof createCMS>;
```

```typescript
// src/pages/blog/index.astro
---
import { createCMS } from '../lib/cms';

const cms = createCMS(import.meta.env.PRIVATE_API_TOKEN);

// Fetch en build time (SSG) o request time (SSR)
const result = await cms.getEntries('blog', { page: 1, pageSize: 20 });
const posts = result.results.map(post => ({
  ...post,
  data: JSON.parse(post.data)
}));

const contentTypes = await cms.getContentTypes();
---

<html>
  <body>
    <h1>Blog</h1>
    
    {contentTypes.map(type => (
      <a href={`/blog/${type.api_identifier}`}>{type.name}</a>
    ))}
    
    {posts.map(post => (
      <article>
        <h2>{post.data.title}</h2>
        <div>{post.data.content}</div>
      </article>
    ))}
  </body>
</html>
```

### 3. Dynamic Route (SSG)

```typescript
// src/pages/blog/[slug].astro
---
import { createCMS } from '../../lib/cms';

export async function getStaticPaths() {
  const cms = createCMS(import.meta.env.PRIVATE_API_TOKEN);
  const types = await cms.getContentTypes();
  
  // Para cada tipo de contenido, obtener sus entradas
  const paths = [];
  
  for (const type of types) {
    const result = await cms.getEntries(type.api_identifier);
    for (const entry of result.results) {
      paths.push({
        params: { slug: type.api_identifier, id: entry.id.toString() },
        props: { 
          type: type.api_identifier,
          entry: { ...entry, data: JSON.parse(entry.data) }
        }
      });
    }
  }
  
  return paths;
}

const { type, entry } = Astro.props;
---

<article>
  <h1>{entry.data.title}</h1>
  <div set:html={entry.data.content} />
  <time>{entry.created_at}</time>
</article>
```

### 4. Obtener un Post Específico

```typescript
// src/pages/post/[slug]/[id].astro
---
import { createCMS } from '../../lib/cms';

const { slug, id } = Astro.params;
const cms = createCMS(import.meta.env.PRIVATE_API_TOKEN);

const entry = await cms.getEntry(slug!, parseInt(id!));

if (!entry) {
  return Astro.redirect('/404');
}

const data = JSON.parse(entry.data);
---

<article>
  <h1>{data.title}</h1>
  <p>Estado: {entry.status}</p>
  <div set:html={data.content} />
</article>
```

### 5. API Endpoint en Astro

```typescript
// src/pages/api/posts.ts
import { createCMS } from '../lib/cms';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const cms = createCMS(import.meta.env.PRIVATE_API_TOKEN);
  
  const body = await request.json();
  const { contentType, page = 1, pageSize = 10 } = body;
  
  try {
    const result = await cms.getEntries(contentType, { page, pageSize });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
};
```

### 6. Hook para fetching (SWR pattern)

```typescript
// src/hooks/useCMS.ts
import { useState, useEffect, useCallback } from 'react';
import { ManagerCMS } from '@managercms/sdk';

export function useCMS(token: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cms = new ManagerCMS({ token });

  const fetchEntries = useCallback(async (contentType: string, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await cms.getEntries(contentType, options);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cms]);

  const fetchEntry = useCallback(async (contentType: string, id: number) => {
    setLoading(true);
    setError(null);
    try {
      const entry = await cms.getEntry(contentType, id);
      setData(entry);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cms]);

  const refetch = useCallback(() => {
    if (data) {
      // re-fetch last request
    }
  }, [data]);

  return { data, loading, error, fetchEntries, fetchEntry, refetch };
}
```

### 7. Fetch con Astro Actions

```typescript
// src/actions/blog.ts
'use server';
import { createCMS } from '../lib/cms';

export async function getBlogPosts(page = 1) {
  'use server';
  const cms = createCMS(process.env.PRIVATE_API_TOKEN!);
  return await cms.getEntries('blog', { page, pageSize: 10 });
}

export async function getPost(slug: string, id: number) {
  'use server';
  const cms = createCMS(process.env.PRIVATE_API_TOKEN!);
  return await cms.getEntry(slug, id);
}

export async function getContentTypes() {
  'use server';
  const cms = createCMS(process.env.PRIVATE_API_TOKEN!);
  return await cms.getContentTypes();
}
```

**Uso en componente:**

```astro
---
import { getBlogPosts } from '../actions/blog';

const { results, count } = await getBlogPosts(1);
---

{results.map(post => (
  <article>{JSON.parse(post.data).title}</article>
))}
```

## 📊 Tipos

```typescript
import type {
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
  ManagerCMSError,
  ITokenStore,
  MemoryTokenStore,
  LocalStorageTokenStore,
} from '@managercms/sdk';

interface Website {
  id: number;
  name: string;
  domain: string;
}

interface ContentType {
  id: number;
  name: string;
  slug: string;
  api_identifier: string;
}

interface Entry {
  id: number;
  created_at: string;
  updated_at: string;
  data: string; // JSON string
  status: 'draft' | 'published' | 'archived';
}

interface GetEntriesOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
  filters?: Record<string, string | number | boolean>;
}

interface PaginatedResponse<T> {
  count: number;
  results: T[];
}
```

### TokenStore (Persistencia de Token)

```typescript
import { MemoryTokenStore, LocalStorageTokenStore, type ITokenStore } from '@managercms/sdk';

// Por defecto (en memoria)
const store = new MemoryTokenStore();

// Para navegador (localStorage)
const browserStore = new LocalStorageTokenStore('managercms_token');

// Personalizado
const customStore: ITokenStore = {
  getToken() { return localStorage.getItem('token'); },
  setToken(token) { localStorage.setItem('token', token); },
  clearToken() { localStorage.removeItem('token'); },
};
```

## ⚙️ Configuración

```typescript
import { ManagerCMS, MemoryTokenStore, LocalStorageTokenStore } from '@managercms/sdk';

interface ManagerCMSConfig {
  token?: string;          // Token de autenticación
  fetch?: typeof fetch;    // Función fetch personalizada
  tokenStore?: ITokenStore; // Store de token personalizado
}

const cms = new ManagerCMS({
  token: 'tu-token',

  // Fetch personalizado (para testing o logging)
  fetch: customFetch,

  // Persistencia de token (Memory por defecto)
  tokenStore: new MemoryTokenStore(),
  // Para navegador: new LocalStorageTokenStore()
});
```

## 🔧 Manejo de Errores

```typescript
import { ManagerCMSError } from '@managercms/sdk';

try {
  const posts = await cms.getEntries('blog');
} catch (error) {
  if (error instanceof ManagerCMSError) {
    console.log('Status:', error.status);      // Código HTTP
    console.log('URL:', error.url);            // Endpoint que falló
    console.log('Data:', error.data);          // Respuesta del servidor
    console.log('Original:', error.originalError); // Error original si existe

    // Serializar para logs
    console.log(JSON.stringify(error.toJSON()));

    if (error.status === 401) {
      // Token inválido o expirado
      cms.clearToken();
    } else if (error.status === 404) {
      // No encontrado
    } else if (error.status === 500) {
      // Error del servidor
    }
  }
}
```

## 🔐 Variables de Entorno (.env)

```env
PRIVATE_API_TOKEN=tu-token-seguro
```

En Astro, las variables con `PUBLIC_` son accesibles en cliente.

## 📝 Notas

- El token debe mantenerse en servidor (no exponer en cliente)
- Usar `client:load` o `client:visible` para componentes interactivos
- Para SSG/SSR, el token puede vivir en server-only

## 🏗️ Arquitectura de Servicios

El SDK está organizado en servicios especializados:

```typescript
const cms = new ManagerCMS({ token });

// Servicio de Contenido (CRUD)
cms.content.getEntries('blog', { page: 1, pageSize: 10 });
cms.content.getEntry('blog', 123);
cms.content.createEntry('blog', { data: {...} });
cms.content.updateEntry('blog', 123, { data: {...} });
cms.content.deleteEntry('blog', 123);

// Servicio de Configuración
cms.settings.healthCheck();
cms.settings.getAPIInfo();
cms.settings.getStats();
cms.settings.getWebsite();
cms.settings.getContentTypes();
```

### Acceso Directo a Servicios

También puedes usar los servicios directamente:

```typescript
import { ContentService, SettingsService, MemoryTokenStore } from '@managercms/sdk';

const store = new MemoryTokenStore();
store.setToken('token');

const content = new ContentService('https://api.manager.1bits.site', store);
const settings = new SettingsService('https://api.manager.1bits.site', store);

const entries = await content.getEntries('blog');
const website = await settings.getWebsite();
```

## 🌐 Compatibilidad

El SDK funciona en:
- **Node.js** (18+) - SSR, API routes, CLI tools
- **Browser** - Client-side apps
- **Bun** - Runtime moderno
- **Deno** - Runtime TypeScript nativo

Para entorno browser sin `localStorage`, usa `MemoryTokenStore` (por defecto).