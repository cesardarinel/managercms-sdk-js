
import { ManagerCMS } from './src/index';

async function debug() {
  // Usamos el token que necesites, o uno vacío para endpoints públicos
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
        if (error.data) console.error(`[SDK Error] Data:`, error.data);
      }
    }
  });

  console.log(`--- Probando SDK con URL: ${cms.apiUrl} ---\n`);

  console.log('1. Probando healthCheck (Debería ser /health)...');
  try {
    const health = await cms.healthCheck();
    console.log('Resultado:', health);
  } catch (e) {
    console.log('Fallo en healthCheck');
  }

  console.log('\n2. Probando stats (El API dice que es público):');
  try {
    const response = await fetch(`${cms.apiUrl}/api/stats`);
    console.log(`Resultado /api/stats: ${response.status} ${response.statusText}`);
    if (response.ok) {
      console.log('DATOS STATS:', await response.json());
    }
  } catch (e) {
    console.log('Error en stats');
  }

  console.log('\n3. Probando variaciones de website y content-types:');
  const variations = [
    '/api/websites/',
    '/api/websites/content-types/'
  ];

  for (const path of variations) {
    console.log(`Probando: ${path}`);
    try {
      const response = await fetch(`${cms.apiUrl}${path}`, {
        headers: { 
          'Authorization': `Bearer KE5fzTCTlU3AdF55P3zM4bJ_fah43OXeWhg_0crt6NwcTq3Kk7lHJNaJqPYA5Bs5`,
          'Accept': 'application/json'
        }
      });
      console.log(`Resultado ${path}: ${response.status} ${response.statusText}`);
      if (response.ok) {
        console.log(`DATOS en ${path}:`, await response.json());
      } else {
        const text = await response.text();
        console.log(`Error body en ${path}:`, text.substring(0, 100));
      }
    } catch (e) {
      console.log(`Error fatal en ${path}`);
    }
  }

  console.log('\n3. Continuando con el flujo normal...');
  try {
    const info = await cms.getAPIInfo();
    console.log('Resultado API Info:', info);
  } catch (e) {
    console.log('Fallo en getAPIInfo');
  }
  }

  debug();
