import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function signIn(page,email){await page.goto('/login');await page.getByLabel('Institutional email').fill(email);await page.getByLabel('Password',{exact:true}).fill('Hostel@123');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('button',{name:'Sign out'})).toBeVisible();}
async function signOut(page){await page.getByRole('button',{name:'Sign out'}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();}
test('TC-Auth/Room/Comp live registration, complaint, bed allocation and maintenance resolution',async({page})=>{
 const unique=Date.now().toString()+Math.floor(Math.random()*1000);const email=`e2e.long.browser.fixture.${unique}@hms.test`;
 await page.goto('/register');await page.getByLabel('SRN',{exact:true}).fill('E2E'+unique);await page.getByLabel('Full name').fill('Browser Student');await page.getByLabel('Institutional email').fill(email);await page.getByLabel('Password',{exact:true}).fill('Hostel@123');await page.getByLabel('Contact number').fill('9000000000');await page.getByRole('button',{name:'Register',exact:true}).click();await expect(page.getByText('Your student account was created. You can now sign in.')).toBeVisible();
 await signIn(page,email);const me=await (await page.request.get('/api/auth/me')).json();
 await page.goto('/complaints');await page.getByLabel('Category',{exact:true}).selectOption({label:'Electrical'});await page.getByLabel('Location (block/room)').fill('Browser room');await page.getByLabel('Description',{exact:true}).fill('Browser fixture fan repair '+unique);await page.getByRole('button',{name:'Submit complaint',exact:true}).click();await expect(page.getByText(/Complaint #\d+ submitted/)).toBeVisible();const complaints=await(await page.request.get('/api/complaints')).json();const complaint=complaints.find(c=>c.description.includes(unique));expect(complaint).toBeTruthy();await signOut(page);
 await signIn(page,'warden@hms.test');await page.goto('/allocations');await page.getByLabel('Search students',{exact:true}).fill(email);await page.getByLabel('Student',{exact:true}).selectOption(String(me.id));const beds=await(await page.request.get('/api/beds/available')).json();expect(beds.length).toBeGreaterThan(0);await page.getByLabel('Available bed',{exact:true}).selectOption(String(beds[0].id));await page.getByRole('button',{name:'Allocate bed',exact:true}).click();await expect(page.getByText(/Allocation #\d+ created/)).toBeVisible();
 await page.goto('/complaints');const staff=await(await page.request.get('/api/maintenance-staff')).json();await page.getByLabel(`Assignee for complaint ${complaint.id}`,{exact:true}).selectOption(String(staff[0].id));await page.getByRole('region',{name:`Assignment for complaint ${complaint.id}`,exact:true}).getByRole('button',{name:'Assign',exact:true}).click();await expect(page.getByText(`Complaint #${complaint.id} assigned.`,{exact:true})).toBeVisible();await signOut(page);
 await signIn(page,'maint1@hms.test');await page.goto('/complaints');let region=page.getByRole('region',{name:`Progress for complaint ${complaint.id}`,exact:true});await region.getByRole('button',{name:'Start work'}).click();await page.getByLabel(`Resolution details for complaint ${complaint.id}`,{exact:true}).fill('Replaced browser fixture capacitor');await page.getByRole('region',{name:`Progress for complaint ${complaint.id}`,exact:true}).getByRole('button',{name:'Mark resolved'}).click();await expect(page.getByText(`Complaint #${complaint.id} resolved.`,{exact:true})).toBeVisible();await signOut(page);
 await signIn(page,email);await page.goto('/notifications');await expect(page.getByText(/resolved/i).first()).toBeVisible();
});
test('TC-UX-01 real role pages pass automated WCAG scans and responsive overflow checks',async({page})=>{
 test.setTimeout(300000);
 page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
 const pages={student:['/','/profile','/my-room','/complaints','/fees','/visitors','/leave','/notifications'],warden:['/inventory','/allocations','/students','/reports','/fees','/visitors','/leave','/complaints','/notifications'],maintenance:['/','/complaints'],admin:['/users','/audit']};
 for(const[role,paths]of Object.entries(pages)){
  await signIn(page,role==='student'?'student1@hms.test':role==='maintenance'?'maint1@hms.test':`${role}@hms.test`);
  for(const width of [375,768,1280])for(const path of paths){await page.setViewportSize({width,height:900});await page.goto(path);await expect(page.getByRole('heading',{level:1}).first(),`${role} ${path}`).toBeVisible({timeout:15000});await expect(page.getByText(/Loading|Checking your session/)).toHaveCount(0);
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(result.violations,`${role} ${path} ${width}`).toEqual([]);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth),`${path} overflow`).toBeLessThanOrEqual(width);
  }await signOut(page);
 }
});
