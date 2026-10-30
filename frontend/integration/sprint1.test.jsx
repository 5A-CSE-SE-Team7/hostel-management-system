import React from 'react';
import { beforeEach, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { AuthProvider } from '../src/auth';
import Login from '../src/pages/Login';
import Profile from '../src/pages/Profile';
import Audit from '../src/pages/Audit';
import Inventory from '../src/pages/Inventory';
import Allocations from '../src/pages/Allocations';
import MyRoom from '../src/pages/MyRoom';
const nativeFetch=globalThis.fetch;
beforeEach(()=>{
 if(!process.env.HMS_API_BASE)throw new Error('Sprint1 tests require the real API');
 let cookie='';
 vi.stubGlobal('fetch',async(path,options={})=>{
  const headers=new Headers(options.headers);if(cookie)headers.set('Cookie',cookie);
  const response=await nativeFetch(new URL(path,process.env.HMS_API_BASE),{...options,headers});
  for(const value of response.headers.getSetCookie())if(value.startsWith('hms.sid='))cookie=value.split(';')[0];
  return response;
 });
});
function mount(){render(<MemoryRouter><AuthProvider><App loginPage={<Login />} accountPages={{Profile:<Profile />,Audit:<Audit />,Inventory:<Inventory />,Allocations:<Allocations />,MyRoom:<MyRoom />}} /></AuthProvider></MemoryRouter>);}
async function login(user,email){await user.type(await screen.findByLabelText('Institutional email'),email);await user.type(screen.getByLabelText('Password'),'Hostel@123');await user.click(screen.getByRole('button',{name:'Sign in'}));await screen.findByRole('heading',{name:'Dashboard'});}
async function logout(user){await user.click(screen.getByRole('button',{name:'Sign out'}));await screen.findByRole('button',{name:'Sign in'});}
it('genuine M2 inventory allocation and student MyRoom integrate with M1 and audit',async()=>{
 const user=userEvent.setup();mount();await login(user,'warden@hms.test');
 await user.click(screen.getByRole('link',{name:'Inventory'}));await screen.findByRole('heading',{name:'Hostel inventory'});await screen.findByText('Block A');
 const students=await(await fetch('/api/students')).json();const student=students.find(s=>s.srn==='PES2UG24CS101');expect(student).toBeTruthy();
 await user.click(screen.getByRole('link',{name:'Allocations'}));const bed=await screen.findByRole('option',{name:/Block A.*Room 101.*Bed 1/});
 await user.type(screen.getByLabelText('Student ID'),String(student.id));await user.selectOptions(screen.getByLabelText('Available bed'),bed.value);await user.click(screen.getByRole('button',{name:'Allocate bed'}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent(/allocated/i));
 await logout(user);await login(user,'student1@hms.test');expect(screen.queryByRole('link',{name:'Inventory'})).toBeNull();expect(screen.queryByRole('link',{name:'Allocations'})).toBeNull();
 expect((await fetch('/api/beds/available')).status).toBe(403);
 await user.click(screen.getByRole('link',{name:'My room'}));expect(await screen.findByRole('heading',{name:'Current assignment'})).toBeVisible();expect(screen.getByText('Block A')).toBeVisible();
 await logout(user);await login(user,'admin@hms.test');await user.click(screen.getByRole('link',{name:'Audit log'}));await screen.findByRole('heading',{name:'Audit log'});await user.click(screen.getByRole('button',{name:'Verify integrity'}));expect(await screen.findByText(/Integrity verified across/)).toBeVisible();
},30000);
it('Sprint1 complaint submission tracking and warden assignment use real accounts',async()=>{
 const user=userEvent.setup();mount();await login(user,'student2@hms.test');await user.click(screen.getByRole('link',{name:'Complaints'}));
 await screen.findByRole('option',{name:'Electrical'});await user.selectOptions(screen.getByLabelText('Category'),screen.getByRole('option',{name:'Electrical'}).value);await user.type(screen.getByLabelText('Location (block/room)'),'A101');await user.type(screen.getByLabelText('Description'),'Sprint1 actual assignment regression');await user.click(screen.getByRole('button',{name:'Submit complaint'}));await screen.findByText(/Complaint #\d+ submitted/);
 const rows=await(await fetch('/api/complaints')).json();const complaint=rows.find(x=>x.description==='Sprint1 actual assignment regression');expect(complaint).toBeTruthy();
 await logout(user);await login(user,'warden@hms.test');await user.click(screen.getByRole('link',{name:'Complaints'}));
 const form=within(await screen.findByRole('region',{name:`Assignment for complaint ${complaint.id}`}));await user.selectOptions(form.getByLabelText(`Assignee for complaint ${complaint.id}`),form.getByRole('option',{name:'Maintenance One'}).value);await user.click(form.getByRole('button',{name:'Assign'}));expect(await screen.findByText(`Complaint #${complaint.id} assigned.`)).toBeVisible();
 const actual=await(await fetch(`/api/complaints/${complaint.id}`)).json();expect(actual.status).toBe('assigned');
},30000);
