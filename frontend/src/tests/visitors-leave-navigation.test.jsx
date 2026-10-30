import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
vi.mock('../auth',()=>({useAuth:vi.fn()}));
import { useAuth } from '../auth';
for (const role of ['student','warden','maintenance','admin']) for (const path of ['/visitors','/leave']) {
 it(`guards ${path} and navigation for ${role}`,()=>{
  useAuth.mockReturnValue({user:{id:1,role},loading:false,logout:vi.fn()});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('[]',{headers:{'content-type':'application/json'}})));
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
  const allowed=role!=='maintenance';
  expect(!!screen.queryByRole('link',{name:'Visitors'})).toBe(allowed);
  expect(!!screen.queryByRole('link',{name:'Leave & outpass'})).toBe(allowed);
  if(!allowed) expect(screen.getByRole('heading',{name:'Access denied'})).toBeVisible();
  expect(screen.queryByRole('link',{name:'Reports'})).toBeNull();
 });
}
