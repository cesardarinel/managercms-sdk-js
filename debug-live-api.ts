import { ManagerCMS } from './src/index';

async function debug() {
  const cms = new ManagerCMS({
    token: 'KE5fzTCTlU3AdF55P3zM4bJ_fah43OXeWhg_0crt6NwcTq3Kk7lHJNaJqPYA5Bs5',
    hooks: {
      onRequest: (url, options) => {
        console.log(`[SDK Request] ${options.method || 'GET'} ${url}`);
      },
      onResponse: (response) => {
        console.log(`[SDK Response] Status: ${response.status} ${response.statusText}`);
      },
      onError: (error, url) => {
        console.error(`[SDK Error] URL: ${url}`);
        console.error(`[SDK Error] Message: ${error.message}`);
      }
    }
  });

  console.log(`--- Probando SDK con URL: ${cms.apiUrl} ---\n`);

  console.log('1. Probando healthCheck...');
  try {
    const health = await cms.healthCheck();
    console.log('Resultado healthCheck:', health);
  } catch (e) {
    console.log('Fallo en healthCheck');
  }

  console.log('\n2. Probando stats (Público)...');
  try {
    const stats = await cms.getStats();
    console.log('Resultado stats:', stats);
  } catch (e) {
    console.log('Error en stats');
  }

  console.log('\n3. Probando getWebsite (Protegido)...');
  try {
    const website = await cms.getWebsite();
    console.log('Resultado getWebsite:', JSON.stringify(website, null, 2));
  } catch (e: any) {
    console.log(`Fallo en getWebsite: ${e.status} ${e.message}`);
  }

  console.log('\n4. Probando API Info...');
  try {
    const info = await cms.getAPIInfo();
    console.log('Resultado API Info:', JSON.stringify(info, null, 2));
  } catch (e) {
    console.log('Fallo en getAPIInfo');
  }

  console.log('\n5. Probando getContentTypes (Protegido)...');
  try {
    const contentTypes = await cms.getContentTypes();
    console.log('Resultado getContentTypes:', JSON.stringify(contentTypes, null, 2));
  } catch (e: any) {
    console.log(`Fallo en getContentTypes: ${e.status} ${e.message}`);
  }

  console.log('\n6. Probando getEntries (probar con paginación)...');
  try {
    const entries = await cms.getEntries('post', { pageSize: 10, page: 1 });
    console.log('Resultado getEntries (con paginación):', JSON.stringify(entries, null, 2));
  } catch (e: any) {
    console.log(`Fallo en getEntries paginado: ${e.status} ${e.message}`);
  }

  console.log('\n7. Probando getEntries (sin paginación)...');
  try {
    const entries = await cms.getEntries('post', {});
    console.log('Resultado getEntries (sin paginación):', JSON.stringify(entries, null, 2));
  } catch (e: any) {
    console.log(`Fallo en getEntries sin paginación: ${e.status} ${e.message}`);
  }

  console.log('\n8. Probando getEntry (obtener un post específico)...');
  try {
    const entry = await cms.getEntry('post', 1);
    console.log('Resultado getEntry:', JSON.stringify(entry, null, 2));
  } catch (e: any) {
    console.log(`Fallo en getEntry: ${e.status} ${e.message}`);
  }
}

debug();