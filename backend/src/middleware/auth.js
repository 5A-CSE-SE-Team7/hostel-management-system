const { E } = require('../utils/errors');

function requireAuth(req, _res, next) {
  if (!req.session?.user) return next(E.unauthenticated());
  return next();
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.session?.user) return next(E.unauthenticated());
    if (!roles.includes(req.session.user.role)) return next(E.forbidden());
    return next();
  };
}

// Shared M2/M4 contract: maintenance staff cannot administer fees or inventory.
const STAFF = ['warden', 'admin'];
module.exports = { requireAuth, requireRole, STAFF };
