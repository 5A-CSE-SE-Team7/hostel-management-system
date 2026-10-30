const crypto = require('crypto');
const config = require('../config');
const { ApiError } = require('../utils/errors');

function requestId(req, res, next) {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

/** Structured access log: timestamp, request id, actor, endpoint, outcome, latency (SAD 4.4). Never logs bodies. */
function accessLog(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    if (config.isTest) return;
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const u = req.session?.user;
    console.log(JSON.stringify({
      ts: new Date().toISOString(), requestId: req.id, user: u ? `${u.role}:${u.id}` : 'anon',
      method: req.method, path: req.originalUrl.split('?')[0], status: res.statusCode, ms: Math.round(ms),
    }));
  });
  next();
}

/** HMS-SR-001: refuse plain HTTP when REQUIRE_HTTPS=true (app sits behind a TLS terminator). */
function enforceHttps(req, res, next) {
  if (!config.requireHttps || req.secure) return next();
  return res.status(426).json({ errorCode: 'HTTPS_REQUIRED', message: 'HTTPS is required', requestId: req.id });
}

/** JSON-only mutations: blocks classic form-post CSRF vectors in addition to SameSite cookies. */
function requireJsonBody(req, _res, next) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.headers['content-length'] !== '0' && Number(req.headers['content-length'] || 0) > 0) {
    if (!req.is('application/json')) return next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json'));
  }
  return next();
}

// eslint-disable-next-line no-unused-vars
function notFound(req, res, next) {
  res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Route not found', requestId: req.id });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500; let errorCode = 'INTERNAL_ERROR'; let message = 'Unexpected server error'; let details;
  if (err instanceof ApiError) {
    ({ status, errorCode, message, details } = err);
  } else if (err.type === 'entity.parse.failed') {
    status = 400; errorCode = 'VALIDATION_ERROR'; message = 'Malformed JSON body';
  } else if (err.type === 'entity.too.large') {
    status = 413; errorCode = 'PAYLOAD_TOO_LARGE'; message = 'Request body too large';
  } else if (err.code === 'ER_DUP_ENTRY') {
    status = 409; errorCode = 'DUPLICATE'; message = 'A record with the same unique value already exists';
  } else {
    console.error(JSON.stringify({ ts: new Date().toISOString(), requestId: req.id, error: err.message, stack: config.isProd ? undefined : err.stack }));
  }
  const body = { errorCode, message, requestId: req.id };
  if (details) body.details = details;
  res.status(status).json(body);
}

module.exports = { requestId, accessLog, enforceHttps, requireJsonBody, notFound, errorHandler };
