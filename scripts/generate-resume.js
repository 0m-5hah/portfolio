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

    try {
      const { PDFDocument } = require('pdf-lib');
      const bytes = fs.readFileSync(outPath);
      const pdfDoc = await PDFDocument.load(bytes);
      pdfDoc.setTitle('Om Shah Resume');
      pdfDoc.setAuthor('Om Shah');
      pdfDoc.setSubject('Cybersecurity and Python Automation');
      pdfDoc.setKeywords([
        'cybersecurity',
        'Python',
        'automation',
        'vulnerability assessment',
        'attack surface monitoring',
        'Nmap'
      ]);
      pdfDoc.setCreator('omshahinfo.com resume generator');
      pdfDoc.setProducer('Playwright + pdf-lib');
      fs.writeFileSync(outPath, await pdfDoc.save());
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
