const { E } = require('../utils/errors');

/** Requires a valid session. Server-side enforcement for HMS-SR-003. */
function requireAuth(req, _res, next) {
  if (!req.session || !req.session.user) return next(E.unauthenticated());
  return next();
}

/** Requires one of the listed roles. Always chain after requireAuth (done here for safety). */
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.session || !req.session.user) return next(E.unauthenticated());
    if (!roles.includes(req.session.user.role)) return next(E.forbidden());
    return next();
  };
}

const STAFF = ['warden', 'admin'];

module.exports = { requireAuth, requireRole, STAFF };
