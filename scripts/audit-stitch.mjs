import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.STITCH_API_KEY;
const PROJECT_ID = '3837531702173487386';
const STITCH_ENDPOINT = 'https://stitch.googleapis.com/mcp';

if (!API_KEY) {
  console.error('Error: STITCH_API_KEY environment variable is not set.');
  process.exit(1);
}

async function callStitchTool(name, args = {}) {
  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name,
      arguments: args,
    },
  };

  const response = await fetch(STITCH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(`JSON-RPC Error [${json.error.code}]: ${json.error.message}`);
  }

  const result = json.result;
  if (result.isError) {
    const msg = result.content?.[0]?.text || JSON.stringify(result);
    throw new Error(`Stitch Tool Error: ${msg}`);
  }

  const rawText = result.content?.[0]?.text;
  if (!rawText) return result;

  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

async function main() {
  const auditDir = path.resolve(process.cwd(), 'audit/stitch-audit');
  const htmlDir = path.join(auditDir, 'html');
  const screenshotsDir = path.join(auditDir, 'screenshots');

  fs.mkdirSync(htmlDir, { recursive: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });

  console.log(`Auditing Stitch project ${PROJECT_ID}...`);
  
  // 1. Get project details for design theme, canvas placement, etc.
  console.log('Fetching project canvas details...');
  const projectDetails = await callStitchTool('get_project', { name: `projects/${PROJECT_ID}` });
  fs.writeFileSync(path.join(auditDir, 'project-details.json'), JSON.stringify(projectDetails, null, 2), 'utf-8');

  // Canvas nodes lookup
  const canvasNodes = new Map();
  if (projectDetails.canvasNodes) {
    for (const node of projectDetails.canvasNodes) {
      canvasNodes.set(node.id, node);
    }
  }

  // 2. Enumerate screens
  console.log('Fetching screens list...');
  const res = await callStitchTool('list_screens', { projectId: PROJECT_ID });
  const screens = res.screens || [];
  console.log(`Discovered ${screens.length} screens.`);

  const inventory = [];

  for (let i = 0; i < screens.length; i++) {
    const s = screens[i];
    const screenId = s.name.split('/').pop();
    console.log(`[${i + 1}/${screens.length}] Processing screen: ${screenId} ("${s.title}")...`);

    const canvasNode = canvasNodes.get(screenId) || {};
    
    const record = {
      index: i + 1,
      id: screenId,
      name: s.title,
      resourceName: s.name,
      deviceType: s.deviceType || canvasNode.deviceType || 'UNKNOWN',
      dimensions: {
        width: canvasNode.width || null,
        height: canvasNode.height || null,
        x: canvasNode.x ?? null,
        y: canvasNode.y ?? null,
      },
      htmlFileName: s.htmlCode?.name || null,
      screenshotFileName: s.screenshot?.name || null,
      htmlStatus: 'NONE',
      screenshotStatus: 'NONE',
      htmlPath: null,
      screenshotPath: null,
      errors: [],
    };

    // Download HTML
    if (s.htmlCode?.name) {
      try {
        const fileRes = await callStitchTool('download_file', { name: s.htmlCode.name });
        const html = typeof fileRes === 'string' ? fileRes : fileRes.html;
        if (html) {
          const outPath = path.join(htmlDir, `${screenId}.html`);
          fs.writeFileSync(outPath, html, 'utf-8');
          record.htmlStatus = 'DOWNLOADED';
          record.htmlPath = `audit/stitch-audit/html/${screenId}.html`;
          record.htmlLength = html.length;
        } else {
          record.htmlStatus = 'EMPTY_RESPONSE';
          record.errors.push('HTML file content was empty');
        }
      } catch (err) {
        record.htmlStatus = 'FAILED';
        record.errors.push(`HTML download failed: ${err.message}`);
        console.warn(`  ! HTML download failed for ${screenId}: ${err.message}`);
      }
    } else {
      record.htmlStatus = 'NOT_AVAILABLE';
    }

    // Download Screenshot
    if (s.screenshot?.name) {
      try {
        const fileRes = await callStitchTool('download_file', { name: s.screenshot.name });
        const base64 = fileRes.image;
        if (base64) {
          const outPath = path.join(screenshotsDir, `${screenId}.png`);
          fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
          record.screenshotStatus = 'DOWNLOADED';
          record.screenshotPath = `audit/stitch-audit/screenshots/${screenId}.png`;
        } else {
          record.screenshotStatus = 'EMPTY_RESPONSE';
          record.errors.push('Screenshot image data was empty');
        }
      } catch (err) {
        record.screenshotStatus = 'FAILED';
        record.errors.push(`Screenshot download failed: ${err.message}`);
        console.warn(`  ! Screenshot download failed for ${screenId}: ${err.message}`);
      }
    } else {
      record.screenshotStatus = 'NOT_AVAILABLE';
    }

    inventory.push(record);
  }

  fs.writeFileSync(path.join(auditDir, 'screens-inventory.json'), JSON.stringify(inventory, null, 2), 'utf-8');
  console.log(`\nAudit complete! Inventory saved to audit/stitch-audit/screens-inventory.json`);
}

main().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
