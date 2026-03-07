# ManagerCMS SDK for JavaScript/TypeScript

SDK oficial para interactuar con la API de ManagerCMS. Soporta tanto operaciones de **Delivery** (lectura de contenidos) como de **Management** (creación, edición y borrado).

## Instalación Privada (Organización)

Este paquete es privado y se instala directamente desde el repositorio de Git de la organización. **No es necesario que el paquete esté publicado en npm.**

### Opción A: Usando SSH (Recomendado)
```bash
npm install git+ssh://git@github.com:cesardarinel/managercms-sdk-js.git
```

### Opción B: Usando HTTPS
```bash
npm install https://github.com/cesardarinel/managercms-sdk-js.git
```

> **Nota Técnica:** El SDK incluye un script de `prepare` que compila automáticamente el código TypeScript a JavaScript en el momento de la instalación. No es necesario subir la carpeta `dist/` al repositorio.

## Uso Rápido

### Inicialización

Por defecto, el SDK apunta a `https://manager.1bits.site`. Solo necesitas tu **token**:

```typescript
import { ManagerCMS } from 'managercms-sdk';

const sdk = new ManagerCMS('tu-token-bearer');
```

Si necesitas usar una URL diferente, puedes pasarla como segundo argumento:

```typescript
const customSdk = new ManagerCMS('tu-token-bearer', 'https://mi-propia-url.com');
```

### Leer Contenidos (Delivery)

#### Obtener información del sitio web
```typescript
const info = await sdk.getWebsiteInfo();
console.log(info.name);
```

#### Listar Entradas con Filtros y Búsqueda
```typescript
const noticias = await sdk.getEntries('noticias', {
  pageSize: 10,
  search: 'tecnología',
  filters: { status: 'publicado' },
  ordering: '-created_at'
});
```

#### Obtener una Entrada específica
```typescript
const noticia = await sdk.getEntry('noticias', 123);
```

### Gestionar Contenidos (Management)

#### Crear una Entrada
```typescript
const nuevaNoticia = await sdk.createEntry('noticias', {
  title: 'Nueva Innovación',
  content: '...',
  status: 'draft'
});
```

#### Actualizar una Entrada
```typescript
await sdk.updateEntry('noticias', 123, {
  title: 'Título Actualizado'
});
```

#### Borrar una Entrada
```typescript
await sdk.deleteEntry('noticias', 123);
```

## Manejo de Errores

El SDK lanza una excepción de tipo `ManagerCMSError` cuando la API devuelve un error (status no 2xx).

```typescript
try {
  await sdk.getEntry('noticias', 999);
} catch (error) {
  if (error instanceof ManagerCMSError) {
    console.error('Status:', error.status); // ej: 404
    console.error('Datos:', error.data);   // Detalles del error de la API
  }
}
```

## Desarrollo y Tests

Si quieres contribuir al SDK:

1. Instala dependencias: `npm install`
2. Ejecuta los tests: `npm test`

Los tests utilizan **Vitest** y simulan las peticiones a la API para asegurar la estabilidad del código.

## Licencia
ISC
