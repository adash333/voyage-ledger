import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',
 timeout:30000,
 use:{baseURL:'http://127.0.0.1:8765',trace:'retain-on-failure'},
 projects:[{name:'mobile-chromium',use:{...devices['iPhone 13'],browserName:'chromium'}}],
 webServer:{command:'python3 -m http.server 8765 --bind 127.0.0.1',url:'http://127.0.0.1:8765',reuseExistingServer:!process.env.CI,timeout:20000}
});