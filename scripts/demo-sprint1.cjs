// Authentic uninterrupted browser capture. Use only a freshly seeded synthetic database.
process.env.NODE_ENV='test';
if(process.env.DB_NAME!=='hms_s1_completion_demo_test')throw Error('Use the dedicated synthetic demo database');
const path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const tools=path.resolve(process.env.HMS_BROWSER_TOOLS||path.join(root,'work/browser-tools/node_modules'));
const {chromium}=require(path.join(tools,'playwright'));
(async()=>{
 const app=require('../backend/src/app').createApp(),pool=require('../backend/src/db').pool;
 const api=http.createServer(app);await new Promise(r=>api.listen(0,'127.0.0.1',r));
 const {createServer}=await import(require('node:url').pathToFileURL(path.join(root,'frontend/node_modules/vite/dist/node/index.js')));
 const vite=await createServer({root:path.join(root,'frontend'),server:{host:'127.0.0.1',port:5176,strictPort:true,proxy:{'/api':{target:`http://127.0.0.1:${api.address().port}`}}}});await vite.listen();
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],slowMo:120});
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,colorScheme:'light',recordVideo:{dir:path.join(root,'work/sprint1-capture'),size:{width:1920,height:1080}}});
 const page=await context.newPage(),video=page.video();page.setDefaultTimeout(10000);
 const start=Date.now(),until=async sec=>{const delay=sec*1000-(Date.now()-start);if(delay>0)await page.waitForTimeout(delay);};
 const click=async locator=>{await locator.hover();await page.waitForTimeout(200);await locator.click();};
 const login=async email=>{await page.getByLabel('Institutional email').fill(email);await page.getByLabel('Password',{exact:true}).fill('Hostel@123');await click(page.getByRole('button',{name:'Sign in',exact:true}));await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();};
 const logout=async()=>{await click(page.getByRole('button',{name:'Sign out'}));await page.getByLabel('Institutional email').waitFor();};
 try{
  await page.goto('http://127.0.0.1:5176');await page.getByLabel('Institutional email').waitFor();await until(2);await login('warden@hms.test');await until(8);
  await click(page.getByRole('link',{name:'Allocations',exact:true}));await page.getByLabel('Student ID',{exact:true}).fill('5');
  const beds=await(await page.request.get('http://127.0.0.1:5176/api/beds/available')).json();
  const [[student]]=await pool.query("SELECT id FROM users WHERE email='student1@hms.test'");await page.getByLabel('Student ID',{exact:true}).fill(String(student.id));await page.getByLabel('Available bed',{exact:true}).selectOption(String(beds[0].id));await until(16);await click(page.getByRole('button',{name:'Allocate bed',exact:true}));await page.getByText(/Allocation #\d+ created/).waitFor();await page.screenshot({path:path.join(root,'work/s1-allocation.png')});await until(23);
  await logout();await login('student1@hms.test');await click(page.getByRole('link',{name:'Complaints',exact:true}));await page.getByLabel('Category',{exact:true}).selectOption({label:'Electrical'});await page.getByLabel('Location (block/room)').fill('Block A, Room 101');await page.getByLabel('Description',{exact:true}).fill('Ceiling fan is not working. Please inspect the wiring.');await until(35);await click(page.getByRole('button',{name:'Submit complaint',exact:true}));await page.getByText(/Complaint #\d+ submitted/).waitFor();await page.screenshot({path:path.join(root,'work/s1-complaint.png')});const [complaint]=await(await page.request.get('http://127.0.0.1:5176/api/complaints')).json();await until(41);
  await logout();await login('warden@hms.test');await click(page.getByRole('link',{name:'Complaints',exact:true}));await page.getByLabel(`Assignee for complaint ${complaint.id}`,{exact:true}).selectOption({label:'Maintenance One'});await page.getByLabel(`Priority for complaint ${complaint.id}`,{exact:true}).selectOption('high');await until(50);await click(page.getByRole('region',{name:`Assignment for complaint ${complaint.id}`,exact:true}).getByRole('button',{name:'Assign',exact:true}));await page.getByText(`Complaint #${complaint.id} assigned.`,{exact:true}).waitFor();await page.screenshot({path:path.join(root,'work/s1-assignment.png')});await until(58);
  console.log('All four real workflows verified; elapsed seconds', (Date.now()-start)/1000);
 }finally{await context.close();fs.writeFileSync(path.join(root,'work/sprint1-video-path.txt'),await video.path());await browser.close();await vite.close();await new Promise(r=>api.close(r));app.locals.sessionStore.close();await pool.end();}
})().catch(e=>{console.error(e);process.exitCode=1;});
