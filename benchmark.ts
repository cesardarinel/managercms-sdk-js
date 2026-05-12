import { ManagerCMS } from './src/index';

function benchmark() {
  const iterations = 100000;
  const config = { token: 'test-token' };
  
  console.log(`Ejecutando benchmark: ${iterations} instanciaciones...`);
  
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    new ManagerCMS(config);
  }
  
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  
  console.log('--- Resultados del Benchmark (Instanciación) ---');
  console.log(`Tiempo total: ${totalTime.toFixed(4)} ms`);
  console.log(`Tiempo promedio por instancia: ${avgTime.toFixed(6)} ms`);
  console.log(`Instancias por segundo: ${Math.round(1000 / avgTime)}`);
  console.log('-------------------------------');
}

async function benchmarkRequest() {
  const cms = new ManagerCMS({ 
    token: 'test-token',
    // Mock de fetch para medir solo el overhead del SDK
    fetch: async () => new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    })
  });

  const iterations = 10000;
  console.log(`Ejecutando benchmark: ${iterations} peticiones (overhead SDK)...`);

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await cms.getWebsite();
  }
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  console.log('--- Resultados del Benchmark (Request Overhead) ---');
  console.log(`Tiempo total: ${totalTime.toFixed(4)} ms`);
  console.log(`Overhead promedio por request: ${avgTime.toFixed(6)} ms`);
  console.log('-------------------------------');
}

benchmark();
benchmarkRequest();
