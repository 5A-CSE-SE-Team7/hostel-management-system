import React, { useCallback, useEffect, useState } from 'react';
import { errorText } from '../api.js';

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  return <div className={`alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Field({ label, id, error, children, hint }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small className="hint">{hint}</small>}
      {error && <small className="field-error" role="alert">{error}</small>}
    </div>
  );
}

/** Text/number/date input bound to a form-state object. */
export function Input({ form, setForm, name, label, type = 'text', required, errors, hint, ...rest }) {
  const id = `f-${name}`;
  return (
    <Field label={label + (required ? ' *' : '')} id={id} error={errors?.[name]} hint={hint}>
      <input id={id} name={name} type={type} required={required} value={form[name] ?? ''} aria-invalid={!!errors?.[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })} {...rest} />
    </Field>
  );
}

export function Select({ form, setForm, name, label, options, required, errors, placeholder = 'Select…' }) {
  const id = `f-${name}`;
  return (
    <Field label={label + (required ? ' *' : '')} id={id} error={errors?.[name]}>
      <select id={id} name={name} required={required} value={form[name] ?? ''} onChange={(e) => setForm({ ...form, [name]: e.target.value })}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </Field>
  );
}

export function Badge({ value }) {
  return <span className={`badge b-${String(value).replace(/_/g, '-')}`}>{String(value).replace(/_/g, ' ')}</span>;
}

export function Table({ columns, rows, empty = 'Nothing to show.', caption }) {
  if (!rows?.length) return <p className="muted">{empty}</p>;
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={caption || 'Data table'}>
      <table>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead><tr>{columns.map((c) => <th key={c.header} scope="col">{c.header}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.id ?? i}>{columns.map((c) => <td key={c.header}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** Loads data on mount / when reload() is called. */
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setData(await fn()); setError(''); } catch (e) { setError(errorText(e)); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

/** Wraps a submit handler: tracks busy state, shows success/error, exposes field errors. */
export function useAction() {
  const [state, setState] = useState({ busy: false, error: '', ok: '', fieldErrors: {} });
  const run = async (fn, okMsg = 'Saved.') => {
    setState({ busy: true, error: '', ok: '', fieldErrors: {} });
    try {
      const r = await fn();
      setState({ busy: false, error: '', ok: okMsg, fieldErrors: {} });
      return r;
    } catch (e) {
      setState({ busy: false, error: e.details ? e.message : errorText(e), ok: '', fieldErrors: e.details || {} });
      return undefined;
    }
  };
  return [state, run];
}

export const fmtDate = (s) => (s ? String(s).replace('T', ' ').slice(0, 16) : '');
export const money = (n) => Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
