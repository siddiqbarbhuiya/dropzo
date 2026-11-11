#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.STITCH_API_KEY;
const DEFAULT_PROJECT_ID = '3837531702173487386';
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
  const [,, command, ...rest] = process.argv;

  switch (command) {
    case 'list-projects': {
      console.log('Fetching projects from Stitch...');
      const res = await callStitchTool('list_projects', {});
      const projects = res.projects || [];
      console.log(`Found ${projects.length} project(s):\n`);
      for (const p of projects) {
        console.log(`- Project ID: ${p.name?.replace('projects/', '')}`);
        console.log(`  Title:      ${p.title}`);
        console.log(`  Visibility: ${p.visibility}`);
        console.log(`  Updated:    ${p.updateTime}\n`);
      }
      break;
    }

    case 'list-screens': {
      const projectId = rest[0] || DEFAULT_PROJECT_ID;
      console.log(`Fetching screens for project ${projectId}...`);
      const res = await callStitchTool('list_screens', { projectId });
      const screens = res.screens || [];
      console.log(`Found ${screens.length} screen(s):\n`);
      screens.forEach((s, idx) => {
        const shortId = s.name.split('/').pop();
        console.log(`${idx + 1}. [${s.deviceType || 'UNKNOWN'}] ${s.title}`);
        console.log(`   ID:     ${shortId}`);
        console.log(`   Resource: ${s.name}`);
        if (s.htmlCode) console.log(`   HTML:   ${s.htmlCode.name}`);
        if (s.screenshot) console.log(`   Image:  ${s.screenshot.name}`);
        console.log('');
      });
      break;
    }

    case 'get-screen': {
      let screenName = rest[0];
      if (!screenName) {
        console.error('Usage: node scripts/stitch.mjs get-screen <screenNameOrId> [projectId]');
        process.exit(1);
      }
      if (!screenName.startsWith('projects/')) {
        const projectId = rest[1] || DEFAULT_PROJECT_ID;
        screenName = `projects/${projectId}/screens/${screenName}`;
      }
      const res = await callStitchTool('get_screen', { name: screenName });
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case 'download-html': {
      let target = rest[0];
      const outputPath = rest[1];
      if (!target) {
        console.error('Usage: node scripts/stitch.mjs download-html <screenIdOrFileName> [outputPath]');
        process.exit(1);
      }

      let fileName = target;
      if (!target.includes('/files/')) {
        let screenName = target;
        if (!screenName.startsWith('projects/')) {
          screenName = `projects/${DEFAULT_PROJECT_ID}/screens/${target}`;
        }
        const screen = await callStitchTool('get_screen', { name: screenName });
        if (!screen.htmlCode?.name) {
          throw new Error(`Screen does not have an HTML code file entry: ${JSON.stringify(screen)}`);
        }
        fileName = screen.htmlCode.name;
      }

      console.log(`Downloading HTML from ${fileName}...`);
      const fileRes = await callStitchTool('download_file', { name: fileName });
      const html = typeof fileRes === 'string' ? fileRes : fileRes.html;

      if (outputPath) {
        const resolved = path.resolve(process.cwd(), outputPath);
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
        fs.writeFileSync(resolved, html, 'utf-8');
        console.log(`Saved HTML to ${resolved}`);
      } else {
        console.log(html);
      }
      break;
    }

    case 'download-image': {
      let target = rest[0];
      const outputPath = rest[1];
      if (!target || !outputPath) {
        console.error('Usage: node scripts/stitch.mjs download-image <screenIdOrFileName> <outputPath>');
        process.exit(1);
      }

      let fileName = target;
      if (!target.includes('/files/')) {
        let screenName = target;
        if (!screenName.startsWith('projects/')) {
          screenName = `projects/${DEFAULT_PROJECT_ID}/screens/${target}`;
        }
        const screen = await callStitchTool('get_screen', { name: screenName });
        if (!screen.screenshot?.name) {
          throw new Error(`Screen does not have a screenshot file entry: ${JSON.stringify(screen)}`);
        }
        fileName = screen.screenshot.name;
      }

      console.log(`Downloading image from ${fileName}...`);
      const fileRes = await callStitchTool('download_file', { name: fileName });
      const base64 = fileRes.image;
      if (!base64) {
        throw new Error('Image data not returned');
      }

      const resolved = path.resolve(process.cwd(), outputPath);
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, Buffer.from(base64, 'base64'));
      console.log(`Saved image to ${resolved}`);
      break;
    }

    case 'generate-screen': {
      const prompt = rest[0];
      const projectId = rest[1] || DEFAULT_PROJECT_ID;
      const deviceType = rest[2] || 'MOBILE';
      if (!prompt) {
        console.error('Usage: node scripts/stitch.mjs generate-screen "<prompt>" [projectId] [deviceType=MOBILE|DESKTOP]');
        process.exit(1);
      }
      console.log(`Generating screen for project ${projectId} (${deviceType})...`);
      console.log(`Prompt: "${prompt}"\n(This may take 1-2 minutes, please wait...)`);
      const res = await callStitchTool('generate_screen_from_text', {
        projectId,
        prompt,
        deviceType,
      });
      console.log('Result:', JSON.stringify(res, null, 2));
      break;
    }

    case 'call': {
      const toolName = rest[0];
      const rawArgs = rest[1] ? JSON.parse(rest[1]) : {};
      if (!toolName) {
        console.error('Usage: node scripts/stitch.mjs call <toolName> \'{"key": "value"}\'');
        process.exit(1);
      }
      const res = await callStitchTool(toolName, rawArgs);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    default:
      console.log(`Dropzo Stitch MCP Client

Usage:
  node scripts/stitch.mjs list-projects
  node scripts/stitch.mjs list-screens [projectId]
  node scripts/stitch.mjs get-screen <screenNameOrId> [projectId]
  node scripts/stitch.mjs download-html <screenIdOrFileName> [outputPath]
  node scripts/stitch.mjs download-image <screenIdOrFileName> <outputPath>
  node scripts/stitch.mjs generate-screen "<prompt>" [projectId] [deviceType]
  node scripts/stitch.mjs call <toolName> '<jsonArgs>'
`);
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
