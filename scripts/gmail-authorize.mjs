import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { google } from 'googleapis';

const credentialsPath =
  process.argv[2] ??
  'C:\\Users\\user\\Documents\\lules-alerta-gmail.json';
const scope = 'https://www.googleapis.com/auth/gmail.send';

const credentials = JSON.parse(await readFile(credentialsPath, 'utf8'));
const desktop = credentials.installed ?? credentials.web;

if (!desktop?.client_id || !desktop.client_secret) {
  throw new Error(
    'El archivo JSON no contiene credenciales OAuth de escritorio válidas.',
  );
}

const server = createServer();
const PORT = 8085;
await new Promise((resolveServer) => {
  server.listen(PORT, '127.0.0.1', () => resolveServer(null));
});

const redirectUri = `http://127.0.0.1:${PORT}/oauth2callback`;
const client = new google.auth.OAuth2(
  desktop.client_id,
  desktop.client_secret,
  redirectUri,
);
const authorizationUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [scope],
});

console.log('Abre esta URL en tu navegador y autoriza la cuenta Gmail configurada:');
console.log(authorizationUrl);
console.log('Esperando la autorización (tienes 30 minutos)...');

const code = await new Promise((resolveCode, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('La autorización excedió el tiempo de espera de 30 minutos.'));
  }, 30 * 60 * 1000);

  server.on('request', (request, response) => {
    const requestUrl = new URL(request.url ?? '/', redirectUri);
    if (requestUrl.pathname !== '/oauth2callback') {
      response.writeHead(404);
      response.end();
      return;
    }

    const error = requestUrl.searchParams.get('error');
    const authorizationCode = requestUrl.searchParams.get('code');
    clearTimeout(timeout);

    if (error || !authorizationCode) {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Autorización cancelada. Puedes cerrar esta ventana.');
      reject(new Error(error ?? 'Google no devolvió un código de autorización.'));
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('¡Autorización completada con éxito! Ya puedes cerrar esta ventana.');
    resolveCode(authorizationCode);
  });
});

const { tokens } = await client.getToken(code);
server.close();

if (!tokens.refresh_token) {
  throw new Error(
    'Google no devolvió un refresh_token. Ejecuta nuevamente el comando.',
  );
}

console.log('\n======================================================');
console.log('✅ ¡AUTORIZACIÓN COMPLETADA CON ÉXITO!');
console.log('======================================================');
console.log('NUEVO GMAIL_REFRESH_TOKEN:');
console.log(tokens.refresh_token);

// Actualizar automáticamente .env local
try {
  const envPath = resolve(process.cwd(), '.env');
  let envContent = await readFile(envPath, 'utf8');
  envContent = envContent.replace(
    /GMAIL_REFRESH_TOKEN=.*/,
    `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`,
  );
  await writeFile(envPath, envContent, 'utf8');
  console.log('\n📄 Archivo .env local actualizado automáticamente.');
} catch (e) {
  console.log('No se pudo actualizar .env local automáticamente:', e.message);
}

console.log('\nRecuerda actualizar GMAIL_REFRESH_TOKEN en las variables de Render.');
