const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './storage/tutorial-frames';
const PROJECT_ID = 'cmovavorj0001vw00qp76xm11';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    colorScheme: 'dark',
  });

  // Intercept APIs to return demo data
  await context.route('**/api/auth/me*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          key: 'DEMO-KEY-001',
          type: 'DAILY',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          usedCount: 0,
          label: '演示账号',
        },
      }),
    });
  });

  await context.route('**/api/projects*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'cmovavorj0001vw00qp76xm11',
            name: '全麦山药茯苓馒头',
            platform: '淘宝',
            style: '清新自然',
            status: 'DRAFT',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'cmovavosi0008vw001qm611u4',
            name: '有机野生蓝莓干',
            platform: '京东',
            style: '高端简约',
            status: 'DRAFT',
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    });
  });

  await context.route('**/api/projects/**/analysis*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'analysis-1',
          projectId: PROJECT_ID,
          normalizedResult: {
            productName: '全麦山药茯苓馒头',
            category: '食品/烘焙',
            targetAudience: '控糖人群、健身人士、养生一族',
            sellingPoints: ['低GI认证', '三重高纤', '乳酸菌发酵', '药食同源'],
            scenarios: ['早餐代餐', '健身补充', '控糖主食'],
          },
        },
      }),
    });
  });

  await context.route('**/api/projects/**/planner*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          sections: [
            { id: 's1', sectionKey: 'hero', type: 'HERO', title: '主图横幅', goal: '吸引眼球', order: 0, status: 'SUCCESS' },
            { id: 's2', sectionKey: 'selling_points', type: 'SELLING_POINTS', title: '核心卖点', goal: '突出优势', order: 1, status: 'SUCCESS' },
            { id: 's3', sectionKey: 'scenario', type: 'SCENARIO', title: '使用场景', goal: '展示应用', order: 2, status: 'SUCCESS' },
            { id: 's4', sectionKey: 'detail_closeup', type: 'DETAIL_CLOSEUP', title: '产品细节', goal: '展示规格', order: 3, status: 'IDLE' },
            { id: 's5', sectionKey: 'specs', type: 'SPECS', title: '参数规格', goal: '详细参数', order: 4, status: 'IDLE' },
          ],
        },
      }),
    });
  });

  await context.route('**/api/projects/**/editor*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          sections: [
            { id: 's1', sectionKey: 'hero', type: 'HERO', title: '主图横幅', copy: '低GI全麦山药茯苓馒头 | 控糖也能吃的主食', visualPrompt: '清新自然风格，产品特写', order: 0, status: 'SUCCESS' },
            { id: 's2', sectionKey: 'selling_points', type: 'SELLING_POINTS', title: '核心卖点', copy: '低GI认证 · 三重高纤 · 乳酸菌发酵 · 药食同源', visualPrompt: '图标+文字排版', order: 1, status: 'SUCCESS' },
            { id: 's3', sectionKey: 'scenario', type: 'SCENARIO', title: '使用场景', copy: '早餐代餐、健身补充、控糖主食', visualPrompt: '生活场景图', order: 2, status: 'SUCCESS' },
          ],
        },
      }),
    });
  });

  const page = await context.newPage();

  // 1. Login page
  console.log('Capturing login...');
  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01-login.png'), fullPage: false });

  // Set auth key for subsequent pages
  await page.evaluate(() => localStorage.setItem('bm_access_key', 'DEMO-KEY-001'));

  // 2. Dashboard / Quick Start
  console.log('Capturing dashboard...');
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02-dashboard.png'), fullPage: false });

  // 3. Analysis page
  console.log('Capturing analysis...');
  await page.goto(`http://localhost:3000/projects/${PROJECT_ID}/analysis`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03-analysis.png'), fullPage: false });

  // 4. Planner page
  console.log('Capturing planner...');
  await page.goto(`http://localhost:3000/projects/${PROJECT_ID}/planner`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04-planner.png'), fullPage: false });

  // 5. Editor page
  console.log('Capturing editor...');
  await page.goto(`http://localhost:3000/projects/${PROJECT_ID}/editor`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05-editor.png'), fullPage: false });

  // 6. Export page
  console.log('Capturing export...');
  await page.goto(`http://localhost:3000/projects/${PROJECT_ID}/export`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '06-export.png'), fullPage: false });

  // 7. History
  console.log('Capturing history...');
  await page.goto('http://localhost:3000/history');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '07-history.png'), fullPage: false });

  // 8. Hero batch
  console.log('Capturing hero-batch...');
  await page.goto('http://localhost:3000/hero-batch');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '08-hero-batch.png'), fullPage: false });

  // 9. Templates
  console.log('Capturing templates...');
  await page.goto('http://localhost:3000/templates');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '09-templates.png'), fullPage: false });

  // 10. Settings - Keys
  console.log('Capturing settings-keys...');
  await page.goto('http://localhost:3000/settings/keys');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '10-settings-keys.png'), fullPage: false });

  // 11. Settings - Providers
  console.log('Capturing settings-providers...');
  await page.goto('http://localhost:3000/settings/providers');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '11-settings-providers.png'), fullPage: false });

  await context.close();
  await browser.close();
  console.log('All screenshots captured!');
}

captureScreenshots().catch(console.error);
