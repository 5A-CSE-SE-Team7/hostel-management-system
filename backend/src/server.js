const fs = require('fs');
const http = require('http');
const https = require('https');
const config = require('./config');
const { createApp } = require('./app');

const app = createApp();
let server;
if (config.tls.key && config.tls.cert) {
  server = https.createServer({ key: fs.readFileSync(config.tls.key), cert: fs.readFileSync(config.tls.cert), minVersion: 'TLSv1.2' }, app);
} else {
  server = http.createServer(app);
}
server.listen(config.port, () => console.log(`HMS API listening on ${config.tls.key ? 'https' : 'http'}://0.0.0.0:${config.port}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
