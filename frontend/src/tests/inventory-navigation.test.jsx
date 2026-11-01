import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
vi.mock('../auth', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../auth';
for (const role of ['student','warden','maintenance','admin']) {
 it(`protects the integrated inventory route for ${role}`, () => {
  useAuth.mockReturnValue({user:{id:1,role},loading:false,logout:vi.fn()});
  render(<MemoryRouter initialEntries={['/inventory']}><App accountPages={{Inventory:<main>Inventory extension</main>,Profile:<main>Account profile</main>}} /></MemoryRouter>);
  expect(!!screen.queryByRole('link',{name:'Inventory'})).toBe(['warden','admin'].includes(role));
  expect(screen.getByRole('link',{name:'My profile'})).toHaveAttribute('href','/profile');
  if (['warden','admin'].includes(role)) expect(screen.getByText('Inventory extension')).toBeVisible();
  else expect(screen.getByRole('heading',{name:'Access denied'})).toBeVisible();
 });
}
