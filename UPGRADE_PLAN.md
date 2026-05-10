# Plan de Mejora de Calidad: ManagerCMS SDK

Este documento detalla la hoja de ruta para elevar el SDK de ManagerCMS a estándares de industria en términos de mantenibilidad, robustez y experiencia del desarrollador (DX).

## Estándares de Ingeniería (Referencia de Calidad)
- **Arquitectura Basada en Servicios:** Organización modular para facilitar la expansión (ej: `sdk.content.getEntries()`).
- **Gestión de Token Flexible:** Soporte para persistencia personalizada del token de autenticación.
- **Compatibilidad Universal:** Funcionamiento garantizado en Browser, Node.js (SSR), Bun y Deno.
- **Seguridad de Tipos Genérica:** Soporte de modelos personalizados para el usuario final.
- **Manejo de Errores Profesional:** Clase de error enriquecida con metadatos de la API.

---

## Fase 1: Arquitectura Modular de Servicios
*Objetivo: Separar la lógica masiva en servicios especializados y fáciles de mantener.*

1.  **Clase `ManagerCMS` (Cliente Principal):**
    - Actúa como punto de entrada único.
    - Centraliza configuración: `apiUrl`, `token`, y `fetch` personalizado.
2.  **Servicios Especializados:**
    - `ContentService`: Gestiona entradas (`getEntries`, `getEntry`, `create`, `update`, `delete`).
    - `SettingsService`: Gestiona información del sitio y esquemas de contenido.
3.  **ManagerCMSError:**
    - Mejorar la clase actual para incluir `originalError`, `url` y un método `.toJSON()` para logs.

---

## Fase 2: Flexibilidad de Autenticación
*Objetivo: Permitir que el SDK gestione el token de forma inteligente según el entorno.*

1.  **Capa de Almacenamiento (TokenStore):**
    - Crear una abstracción para guardar el token.
    - Implementación `MemoryStore` (por defecto).
    - Guía para implementar `LocalStorageStore` o `CookieStore` para aplicaciones web.
2.  **Interceptor de Peticiones:**
    - Asegurar que el token se inyecte automáticamente en cada cabecera `Authorization`.

---

## Fase 3: Estrategia de Testing Rigurosa
*Objetivo: Alcanzar una cobertura del >90% con tests unitarios e integración.*

1.  **Testing de Servicios:** Cada método de servicio debe tener su equivalente en test simulando respuestas exitosas y fallidas (mocks).
2.  **Validación SSR:** Tests específicos que verifiquen el comportamiento en entornos sin `window` o `document`.
3.  **Mocks Globales:** Estandarizar el uso de `vi.stubGlobal('fetch')` para evitar peticiones reales durante el desarrollo.

---

## Fase 4: Documentación Técnica de Referencia
*Objetivo: Documentación clara, reproducible y profesional.*

1.  **API Reference (TypeDoc):** Generación automática de documentación HTML basada en JSDoc.
2.  **Guías de Implementación:**
    - Uso con Frameworks Modernos (Next.js, Vite).
    - Guía de Manejo de Errores y Retries.
3.  **Ejemplos de Código (Cookbook):** Recetas comunes como "Filtrado avanzado" o "Subida de archivos".

---

## Fase 5: Pipeline de Distribución (Tooling)
*Objetivo: Empaquetado ligero y compatible con todos los ecosistemas JS.*

1.  **Build Multi-target:** Configurar para generar formatos `ESM` y `CJS`.
2.  **Declaraciones de Tipos:** Generar archivos `.d.ts` precisos.
3.  **Automatización de Calidad:** Configurar ESLint (reglas estrictas) y Prettier para consistencia de código.

---

## Paso a Paso para Desarrolladores

1.  **Nuevas Funciones:** Implementar en el servicio correspondiente (ej: `src/services/ContentService.ts`).
2.  **Tipado:** Todas las interfaces deben vivir en `src/models/` y ser exportadas.
3.  **Pruebas:** No se considera terminada una función sin su test en `*.test.ts`.
4.  **Documentación:** Usar JSDoc en cada método público siguiendo el estándar establecido.
