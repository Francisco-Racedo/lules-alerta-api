import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
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
await new Promise((resolve) => {
  server.listen(0, '127.0.0.1', resolve);
});

const address = server.address();
if (!address || typeof address === 'string') {
  throw new Error('No se pudo abrir el puerto local para la autorización.');
}

const redirectUri = `http://127.0.0.1:${address.port}/oauth2callback`;
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
console.log('Esperando la autorización...');

const code = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('La autorización excedió el tiempo de espera de 5 minutos.'));
  }, 5 * 60 * 1000);

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
    response.end('Autorización completada. Puedes cerrar esta ventana.');
    resolve(authorizationCode);
  });
});

const { tokens } = await client.getToken(code);
server.close();

if (!tokens.refresh_token) {
  throw new Error(
    'Google no devolvió un refresh_token. Ejecuta nuevamente el comando.',
  );
}

console.log('\nAutorización completada.');
console.log('Configura estos valores como variables seguras del backend:');
console.log(`GMAIL_CLIENT_ID=${desktop.client_id}`);
console.log(`GMAIL_CLIENT_SECRET=${desktop.client_secret}`);
console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
console.log('GMAIL_SENDER=franciscor829@gmail.com');
console.log(
  '\nNo compartas estos valores ni los pegues en el repositorio o en el chat.',
);
