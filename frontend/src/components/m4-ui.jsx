// Compatibility boundary for the existing M4 screens and the shared S03 kit.
import { useEffect, useId, useRef, useState } from 'react';
import { Alert as SharedAlert, Badge as SharedBadge, DataTable, Field } from './ui';
export function Alert({ children, kind }) { return <SharedAlert error={kind !== 'success'}>{children}</SharedAlert>; }
export function Badge({ value }) { return <SharedBadge>{value}</SharedBadge>; }
export function Input({ form, setForm, errors = {}, name, hint, ...props }) {
  return <><Field {...props} name={name} value={form[name] ?? ''} error={errors[name]} onChange={e => setForm(old => ({ ...old, [name]: e.target.value }))} />{hint && <small>{hint}</small>}</>;
}
export function Select({ form, setForm, errors = {}, name, label, options, ...props }) {
  const id = useId(), error = errors[name];
  return <div className="field"><label htmlFor={id}>{label}</label><select {...props} id={id} name={name} value={form[name]} onChange={e => setForm(old => ({ ...old, [name]: e.target.value }))} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}>
    {props.required && <option value="">Choose an option</option>}{options.map(option => { const value = typeof option === 'string' ? option : option.value; return <option key={value} value={value}>{typeof option === 'string' ? option : option.label}</option>; })}
  </select>{error && <span className="error" id={`${id}-error`}>{error}</span>}</div>;
}
export function Table({ columns, rows, loading, error, ...props }) {
  if (loading) return <SharedAlert>Loading records…</SharedAlert>;
  if (error) return null;
  return <DataTable {...props} rows={rows || []} columns={columns.map((column, i) => ({ ...column, label: column.header, key: column.key || `column-${i}` }))} />;
}
export function fmtDate(value) { return value ? String(value).replace('T', ' ').replace(/\.\d+Z$/, ' UTC') : '—'; }
export function toUtc(value) { const date = new Date(value); return value && !Number.isNaN(date.getTime()) ? date.toISOString() : value; }
export function useAction() {
  const [state, setState] = useState({ busy: false, error: '', ok: '', fieldErrors: {} });
  const active = useRef(true), busy = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function run(action, message = '') {
    if (busy.current) return null;
    busy.current = true; setState({ busy: true, error: '', ok: '', fieldErrors: {} });
    try { const result = await action(); if (active.current) setState({ busy: false, error: '', ok: message, fieldErrors: {} }); return result === null ? true : result; }
    catch (error) { if (active.current) setState({ busy: false, error: error.message || 'Request failed. Please retry.', ok: '', fieldErrors: error.details || {} }); return null; }
    finally { busy.current = false; }
  }
  return [state, run];
}
export function useLoad(loader, dependencies = []) {
  const latest = useRef(loader); latest.current = loader;
  const generation = useRef(0); const [version, setVersion] = useState(0);
  const [state, setState] = useState({ data: null, error: '', loading: true });
  useEffect(() => {
    const current = ++generation.current;
    setState(old => ({ ...old, loading: true, error: '' }));
    Promise.resolve().then(() => latest.current()).then(data => { if (generation.current === current) setState({ data, error: '', loading: false }); }).catch(error => { if (generation.current === current) setState({ data: null, error: error.message || 'Could not load records.', loading: false }); });
    return () => { generation.current += 1; };
  }, [...dependencies, version]);
  return { ...state, reload: () => setVersion(old => old + 1) };
}
