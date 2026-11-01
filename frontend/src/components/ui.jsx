import { useId } from 'react';
export function Alert({ children, error = false }) {
  return children ? <p role={error ? 'alert' : 'status'} className={error ? 'alert error' : 'alert'}>{children}</p> : null;
}
export function Field({ label, error, ...props }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}</label><input {...props} id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />{error && <span id={`${id}-error`} className="error">{error}</span>}</div>;
}
export function Badge({ children }) { return <span className="badge">{children}</span>; }
export function DataTable({ caption, columns, rows, rowKey = 'id', empty = 'No records yet.' }) {
  if (!rows.length) return <Alert>{empty}</Alert>;
  return <div className="table-scroll"><table><caption>{caption}</caption><thead><tr>{columns.map(c => <th scope="col" key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row[rowKey]}>{columns.map(c => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}</tr>)}</tbody></table></div>;
}
