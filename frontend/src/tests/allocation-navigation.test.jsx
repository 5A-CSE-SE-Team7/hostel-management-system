import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
vi.mock('../auth', () => ({useAuth:vi.fn()}));
import { useAuth } from '../auth';
for (const role of ['student','warden','maintenance','admin']) {
 for (const path of ['/allocations','/my-room']) it(`protects ${path} for ${role}`, () => {
  useAuth.mockReturnValue({user:{id:1,role},loading:false,logout:vi.fn()});
  render(<MemoryRouter initialEntries={[path]}><App accountPages={{Allocations:<main>Allocation extension</main>,MyRoom:<main>Room extension</main>,Inventory:<main>Inventory extension</main>}} /></MemoryRouter>);
  expect(!!screen.queryByRole('link',{name:'Allocations'})).toBe(['warden','admin'].includes(role));
  expect(!!screen.queryByRole('link',{name:'My room'})).toBe(role==='student');
  const allowed=path==='/my-room'?role==='student':['warden','admin'].includes(role);
  if(!allowed) expect(screen.getByRole('heading',{name:'Access denied'})).toBeVisible();
  else expect(screen.getByText(path==='/my-room'?'Room extension':'Allocation extension')).toBeVisible();
 });
}
