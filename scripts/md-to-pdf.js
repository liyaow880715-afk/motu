const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

async function main() {
  const mdPath = process.argv[2] || path.join(__dirname, '../docs/TUTORIAL.md');
  const outPath = process.argv[3] || mdPath.replace(/\.md$/i, '.pdf');

  if (!fs.existsSync(mdPath)) {
    console.error('File not found:', mdPath);
    process.exit(1);
  }

  const md = fs.readFileSync(mdPath, 'utf8');
  const htmlBody = marked.parse(md);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>摹图 — AI 设置与生成详情页教程</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  body {
    font-family: "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #333;
  }
  h1 { font-size: 20pt; color: #111; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 0; }
  h2 { font-size: 14pt; color: #1a1a1a; margin-top: 24px; border-left: 4px solid #3b82f6; padding-left: 10px; }
  h3 { font-size: 12pt; color: #222; margin-top: 18px; }
  h4 { font-size: 11pt; color: #333; margin-top: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  tr:nth-child(even) { background: #f9fafb; }
  code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: "SF Mono", Consolas, monospace;
    font-size: 10pt;
  }
  pre {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 9.5pt;
  }
  pre code { background: none; padding: 0; color: inherit; }
  blockquote {
    border-left: 4px solid #3b82f6;
    margin: 12px 0;
    padding: 8px 16px;
    background: #eff6ff;
    color: #1e40af;
  }
  ul, ol { margin: 8px 0; padding-left: 24px; }
  li { margin: 4px 0; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
  p { margin: 8px 0; }
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;

  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' }
  });
  await browser.close();

  console.log('PDF saved to:', path.resolve(outPath));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
