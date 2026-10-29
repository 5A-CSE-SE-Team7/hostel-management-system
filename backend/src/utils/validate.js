const { E } = require('./errors');

/**
 * Tiny schema validator. rules: { field: { type, required, min, max, enum, pattern, label } }
 * types: string | int | number | date | datetime | email | bool
 * Returns a cleaned object containing only declared fields.
 */
function validate(body, rules) {
  const errors = {};
  const out = {};
  const src = body && typeof body === 'object' ? body : {};
  for (const [field, r] of Object.entries(rules)) {
    let v = src[field];
    const label = r.label || field;
    if (typeof v === 'string') v = v.trim();
    if (v === undefined || v === null || v === '') {
      if (r.required) errors[field] = `${label} is required`;
      continue;
    }
    switch (r.type || 'string') {
      case 'string':
        if (typeof v !== 'string') { errors[field] = `${label} must be text`; continue; }
        if (r.min && v.length < r.min) errors[field] = `${label} must be at least ${r.min} characters`;
        if (r.max && v.length > r.max) errors[field] = `${label} must be at most ${r.max} characters`;
        break;
      case 'email':
        if (typeof v !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length > 190) {
          errors[field] = `${label} must be a valid email address`; continue;
        }
        v = v.toLowerCase();
        break;
      case 'int':
      case 'number': {
        const n = Number(v);
        if (!Number.isFinite(n) || (r.type === 'int' && !Number.isInteger(n))) { errors[field] = `${label} must be a ${r.type === 'int' ? 'whole ' : ''}number`; continue; }
        if (r.min !== undefined && n < r.min) errors[field] = `${label} must be >= ${r.min}`;
        if (r.max !== undefined && n > r.max) errors[field] = `${label} must be <= ${r.max}`;
        v = n;
        break;
      }
      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) { errors[field] = `${label} must be a date (YYYY-MM-DD)`; continue; }
        break;
      case 'datetime': {
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) { errors[field] = `${label} must be a valid date/time`; continue; }
        v = d.toISOString().slice(0, 19).replace('T', ' ');
        break;
      }
      case 'bool':
        v = v === true || v === 'true' || v === 1 || v === '1';
        break;
      default:
    }
    if (r.enum && !r.enum.includes(v)) errors[field] = `${label} must be one of: ${r.enum.join(', ')}`;
    if (r.pattern && !r.pattern.test(String(v))) errors[field] = r.patternMessage || `${label} is not in a valid format`;
    out[field] = v;
  }
  if (Object.keys(errors).length) throw E.validation(errors);
  return out;
}

const parseId = (v, what = 'id') => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw E.validation({ [what]: `${what} must be a positive integer` });
  return n;
};

module.exports = { validate, parseId };
