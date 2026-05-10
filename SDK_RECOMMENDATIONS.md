# Recomendaciones para el SDK de ManagerCMS

## Contexto

El SDK `@managercms/sdk` es una librería genérica diseñada para funcionar en múltiples proyectos (blogs, sitios web, aplicaciones). Esto significa que debe mantenerse flexible mientras ofrece una buena experiencia de desarrollo.

---

## 1. Estructura del API Response

### Problema actual
El API retorna diferentes formatos dependiendo del endpoint:
- Algunos endpoints retornan un array directo: `[...]`
- Otros retornan un objeto paginado: `{ count, results, next, previous }`

### Recomendación
**Estandarizar todos los endpoints** para retornar siempre el mismo formato. Opciones:

**Opción A: Siempre paginado**
```json
{
  "count": 12,
  "results": [...],
  "next": null,
  "previous": null
}
```

**Opción B: Usar headers HTTP**
- Si es array: headers no incluyen `X-Total-Count`
- Si es paginado: incluir `X-Total-Count`, `X-Next-Page`, etc.

### Beneficio
- El SDK no necesita lógica para detectar tipos
- Código más simple y mantenible
- Mejor rendimiento (sin validaciones innecesarias)

---

## 2. Normalización de Relaciones (Autor, Etiquetas)

### Problema actual
Los datos de relaciones vienen anidados con estructuras inconsistentes:

```json
// Actual (inconsistente)
{
  "autor": {
    "id": 2,
    "label": "Cesar Ortiz",
    "data": { "nombre": "Cesar Ortiz" }
  },
  "etiquetas": [
    { "id": 10, "label": "personal", "data": { "nombre": "personal", "slug": "personal" } }
  ]
}
```

### Recomendación
**Opción A: Solo IDs en el contenido**
```json
{
  "autor": 2,
  "etiquetas": [10, 30, 19]
}
```
El cliente resuelve las relaciones con endpoints especializados.

**Opción B: Datos planos embebidos**
```json
{
  "autor": { "id": 2, "nombre": "Cesar Ortiz", "slug": "cesar-ortiz" },
  "etiquetas": [
    { "id": 10, "nombre": "personal", "slug": "personal" }
  ]
}
```

### Beneficio
- Elimina redundancia de datos
- Reduce payload de la API
- Más fácil de cachear en el cliente

---

## 3. Versionado del API

### Recomendación
Implementar versionado semántico desde el inicio:

```
/api/v1/websites/...
/api/v2/websites/...  (futuro)
```

El SDK podría detectar la versión automáticamente:
```typescript
const apiVersion = await cms.getAPIVersion(); // "v1"
```

---

## 4. SDK - Opciones de Configuración

### Recomendaciones para el constructor:

```typescript
interface ManagerCMSConfig {
  apiUrl: string;
  token?: string;
  fetch?: typeof fetch;
  tokenStore?: ITokenStore;
  
  // Nuevas opciones
  defaultPageSize?: number;        // Para paginación por defecto
  timeout?: number;                // Timeout de requests en ms
  retries?: number;               // Reintentos automáticos
  cacheEnabled?: boolean;         // Habilitar cache en memoria
  cacheTTL?: number;               // TTL del cache en segundos
}
```

---

## 5. Sistema de Cache

### Recomendación
Implementar cache opcional en el SDK:

```typescript
const cms = new ManagerCMS({
  apiUrl: '...',
  token: '...',
  cacheEnabled: true,
  cacheTTL: 300  // 5 minutos
});

// El SDK cachea automáticamente
await cms.getEntries('post');  // Fetch
await cms.getEntries('post');  // Cache hit
```

---

## 6. Métodos de Filtrado

### Recomendación
Soportar filtros avanzados de forma tipada:

```typescript
// En el SDK
interface GetEntriesOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
  filters?: Record<string, string | number | boolean>;
  
  // Nuevo: filtros por estado
  status?: 'draft' | 'published' | 'archived';
  
  // Nuevo: rango de fechas
  createdAfter?: string;  // ISO date
  createdBefore?: string;
}

// Uso
await cms.getEntries('post', { 
  status: 'published',
  ordering: '-created_at',
  pageSize: 20 
});
```

---

## 7. Documentación del SDK

### Recomendación
Generar documentación automática con TypeDoc y publicar en GitHub Pages:

```
/docs
  /classes
    ManagerCMS.md
  /interfaces
    GetEntriesOptions.md
```

Incluir ejemplos funcionales, no solo snippets.

---

## 8. Mejora en Manejo de Errores

### Recomendación
Crear errores específicos por tipo:

```typescript
class NotFoundError extends ManagerCMSError {}
class UnauthorizedError extends ManagerCMSError {}
class ValidationError extends ManagerCMSError {}
class ServerError extends ManagerCMSError {}

try {
  await cms.getEntry('post', 999);
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle 404
  }
}
```

---

## 9. Middleware/Hooks

### Recomendación
Permitir interceptores para logging, métricas, etc.:

```typescript
const cms = new ManagerCMS({
  apiUrl: '...',
  token: '...',
  onRequest: (url, options) => {
    console.log(`[${new Date().toISOString()}] ${options.method} ${url}`);
  },
  onResponse: (response) => {
    metrics.increment('api_calls', { status: response.status });
  },
  onError: (error) => {
    Sentry.captureException(error);
  }
});
```

---

## 10. Publicación del Paquete

### Recomendación
Publicar en npm como `@managercms/sdk`:

```bash
npm publish --access public
```

Ventajas:
- Instalación más limpia: `npm install @managercms/sdk`
- SemVer automático
- Comunidad puede contribuir

---

## Resumen de Prioridades

| Prioridad | Mejora | Impacto |
|-----------|--------|---------|
| 🔴 Alta | Estandarizar formato de respuesta | Simplifica SDK |
| 🔴 Alta | Normalizar datos de relaciones | Reduce payload |
| 🟡 Media | Sistema de cache | Mejora rendimiento |
| 🟡 Media | Errores específicos | Mejor DX |
| 🟢 Baja | Middleware/hooks | Para uso avanzado |

---

## Conclusión

El SDK es sólido como base. Las mejoras más importantes para el futuro son:

1. **Estandarizar el API** para no necesitar lógica condicional en el cliente
2. **Simplificar las estructuras de datos** para relaciones
3. **Publicar en npm** para facilitar adopción

Estas cambios reducirían significativamente la complejidad tanto en el SDK como en los proyectos que lo consumen.