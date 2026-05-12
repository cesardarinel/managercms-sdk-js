# Changelog

## [2.1.0] - 2026-05-12

### Cambios en el SDK (Inmutabilidad de API URL)
Se ha fijado la URL base de la API para garantizar que el SDK siempre apunte al punto de conexión oficial y no pueda ser alterado por configuraciones externas.

#### Removido (Breaking Changes)
- Se eliminó la propiedad `apiUrl` de la interfaz `ManagerCMSConfig`. El SDK ahora usa exclusivamente `https://api.manager.1bits.site`.
- Ya no es necesario pasar `apiUrl` al constructor de `ManagerCMS`.

#### Mejoras de Rendimiento
- **Optimización de Instanciación**: Se eliminó el procesamiento de strings y validaciones por expresiones regulares en el constructor de `ManagerCMS`. Esto reduce el overhead al crear nuevas instancias del cliente, resultando en una respuesta de inicialización más rápida.

### Guía de Migración para Implementadores
Si tu proyecto utilizaba la propiedad `apiUrl` para configurar el SDK:
1. Elimina la propiedad `apiUrl` de tu configuración de inicialización:
   ```typescript
   // Antes
   const cms = new ManagerCMS({ apiUrl: '...', token: '...' });
   
   // Ahora
   const cms = new ManagerCMS({ token: '...' });
   ```
2. Puedes retirar la variable de entorno `PUBLIC_API_URL` de tu archivo `.env` si solo se usaba para inicializar el SDK.
3. El SDK ahora es más ligero y rápido al evitar lógicas de validación dinámica de URL en tiempo de ejecución.
