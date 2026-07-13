#!/usr/bin/env node
/**
 * Generate om-shah-resume.pdf from resume.html via Playwright (Chromium).
 * Usage: npm run generate:resume
 */
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

async function main() {
  const { chromium } = require('playwright');

  const root = path.resolve(__dirname, '..');
  const htmlPath = path.join(root, 'resume.html');
  const outPath = path.join(root, 'om-shah-resume.pdf');

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Missing resume HTML at ${htmlPath}`);
  }

  const fileUrl = pathToFileURL(htmlPath).href;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(fileUrl, { waitUntil: 'networkidle' });

    // Ensure education config has applied and webfonts (if any) are ready
    await page.waitForFunction(() => document.fonts && document.fonts.status === 'loaded');
    await new Promise((resolve) => setTimeout(resolve, 300));

    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      displayHeaderFooter: false,
      tagged: true
    });

    // PDF metadata via pdf-lib if available; otherwise Chromium sets title from <title>
    try {
      const { PDFDocument } = require('pdf-lib');
      const bytes = fs.readFileSync(outPath);
      const pdfDoc = await PDFDocument.load(bytes);
      pdfDoc.setTitle('Om Shah Resume');
      pdfDoc.setAuthor('Om Shah');
      pdfDoc.setSubject('Cybersecurity, Security Automation and Vulnerability Management');
      pdfDoc.setKeywords([
        'cybersecurity',
        'Python',
        'security automation',
        'vulnerability management',
        'Nmap',
        'attack surface management'
      ]);
      pdfDoc.setCreator('omshahinfo.com resume generator');
      pdfDoc.setProducer('Playwright + pdf-lib');
      const out = await pdfDoc.save();
      fs.writeFileSync(outPath, out);
    } catch (metaErr) {
      console.warn('PDF generated without extended metadata:', metaErr.message);
    }

    console.log(`Wrote ${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
