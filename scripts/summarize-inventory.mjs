import fs from 'node:fs';

const inventory = JSON.parse(fs.readFileSync('audit/stitch-audit/screens-inventory.json', 'utf-8'));
console.log('Total items in inventory:', inventory.length);

const htmlDownloaded = inventory.filter(s => s.htmlStatus === 'DOWNLOADED').length;
const htmlNone = inventory.filter(s => s.htmlStatus === 'NOT_AVAILABLE').length;
const htmlFailed = inventory.filter(s => s.htmlStatus === 'FAILED').length;

const imgDownloaded = inventory.filter(s => s.screenshotStatus === 'DOWNLOADED').length;
const imgNone = inventory.filter(s => s.screenshotStatus === 'NOT_AVAILABLE').length;
const imgFailed = inventory.filter(s => s.screenshotStatus === 'FAILED').length;

console.log(`HTML: Downloaded=${htmlDownloaded}, Not Available=${htmlNone}, Failed=${htmlFailed}`);
console.log(`Screenshots: Downloaded=${imgDownloaded}, Not Available=${imgNone}, Failed=${imgFailed}`);

const errors = inventory.filter(s => s.errors.length > 0);
console.log('Screens with errors:', errors.length);
for (const e of errors) {
  console.log(`  - [${e.id}] "${e.name}": ${e.errors.join('; ')}`);
}

console.log('\n--- ALL SCREENS BREAKDOWN ---');
for (const s of inventory) {
  console.log(`${s.index}. [${s.deviceType}] ${s.name} (${s.id})`);
  console.log(`   Dimensions: ${s.dimensions.width}x${s.dimensions.height} | HTML: ${s.htmlStatus} | Screenshot: ${s.screenshotStatus}`);
}
