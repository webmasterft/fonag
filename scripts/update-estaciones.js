#!/usr/bin/env node
/**
 * update-estaciones.js
 * Regenera src/data/estaciones.json desde el API SEDC autenticado.
 * Usar cuando haya cambios en la base de datos de estaciones.
 *
 * Uso: node scripts/update-estaciones.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

function requestHttps(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    if (postData) {
      opts.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  const baseUrl = 'https://sedc.fonag.org.ec';
  const username = process.env.SEDC_USERNAME || '***REMOVED***';
  const password = process.env.SEDC_PASSWORD || '***REMOVED***';

  console.log('🔐 Authenticating with SEDC...');
  const loginPage = await requestHttps(`${baseUrl}/login/`);
  let csrf = '';
  (loginPage.headers['set-cookie'] || []).forEach((c) => {
    if (c.startsWith('csrftoken=')) csrf = c.split(';')[0].split('=')[1];
  });

  const postData =
    'username=' + encodeURIComponent(username) +
    '&password=' + encodeURIComponent(password) +
    '&csrfmiddlewaretoken=' + encodeURIComponent(csrf) +
    '&next=/';

  const loginRes = await requestHttps(
    `${baseUrl}/login/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: `csrftoken=${csrf}`,
        Referer: `${baseUrl}/login/`,
      },
    },
    postData
  );

  let finalCsrf = csrf;
  let sessionId = '';
  (loginRes.headers['set-cookie'] || []).forEach((c) => {
    if (c.startsWith('csrftoken=')) finalCsrf = c.split(';')[0].split('=')[1];
    if (c.startsWith('sessionid=')) sessionId = c.split(';')[0].split('=')[1];
  });

  if (!sessionId) {
    throw new Error('Login failed — no session ID received');
  }

  const cookie = `csrftoken=${finalCsrf}; sessionid=${sessionId}`;
  console.log('✅ Session obtained');

  console.log('📡 Fetching station list...');
  const apiRes = await requestHttps(
    `${baseUrl}/estacion/list/?administrador=1&limit=300`,
    {
      headers: {
        Cookie: cookie,
        Referer: baseUrl,
        'X-Requested-With': 'XMLHttpRequest',
      },
    }
  );

  const data = JSON.parse(apiRes.body);
  const list = Array.isArray(data) ? data : (data.results || data);

  if (!Array.isArray(list)) {
    throw new Error('Unexpected API response format');
  }

  // Verify eje_trabajo is present
  const withEje = list.filter((s) => s.eje_trabajo);
  console.log(`✅ Received ${list.length} stations, ${withEje.length} with eje_trabajo`);

  // Show breakdown by eje
  const byEje = {};
  list.forEach((s) => {
    const eje = s.eje_trabajo || 'NULL';
    byEje[eje] = (byEje[eje] || 0) + 1;
  });
  console.log('📊 By eje_trabajo:');
  Object.entries(byEje).sort().forEach(([k, v]) => console.log(`   ${k}: ${v}`));

  const output = {
    generated: new Date().toISOString(),
    source: `${baseUrl}/estacion/list/`,
    count: list.length,
    results: list,
  };

  const outPath = path.resolve(__dirname, '..', 'src', 'data', 'estaciones.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Saved to ${outPath}`);
  console.log('Done. Restart the dev server to pick up changes.');
}

main().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
