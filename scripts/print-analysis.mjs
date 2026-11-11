import fs from 'node:fs';

const analysis = JSON.parse(fs.readFileSync('audit/stitch-audit/screens-analysis.json', 'utf-8'));
for (const a of analysis) {
  console.log(`[#${a.index}] ${a.name} (${a.deviceType}, ${a.dimensions})`);
  if (a.pageTitle) console.log(`    Title: ${a.pageTitle}`);
  if (a.headings && a.headings.length > 0) console.log(`    Headings: ${a.headings.slice(0, 3).join(' | ')}`);
  if (a.sampleButtons && a.sampleButtons.length > 0) console.log(`    Buttons: ${a.sampleButtons.slice(0, 4).join(', ')}`);
}
