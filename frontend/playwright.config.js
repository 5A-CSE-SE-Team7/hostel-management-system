import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',timeout:120000,workers:1,fullyParallel:false,reporter:'list',
 use:{baseURL:'http://127.0.0.1:5173',trace:'retain-on-failure',actionTimeout:15000},
 projects:[{name:'chrome',use:{browserName:'chromium',channel:process.env.HMS_CHROMIUM_PATH?undefined:'chrome',launchOptions:process.env.HMS_CHROMIUM_PATH?{executablePath:process.env.HMS_CHROMIUM_PATH}:undefined}},{name:'firefox',use:{browserName:'firefox'}}],
 webServer:[
 {command:'node ../backend/src/server.js',url:'http://127.0.0.1:4000/api/health',reuseExistingServer:false,env:{NODE_ENV:'test',DB_NAME:'hms_e2e',PORT:'4000'}},
 {command:'npm run dev -- --host 127.0.0.1',url:'http://127.0.0.1:5173',reuseExistingServer:false}]
});
