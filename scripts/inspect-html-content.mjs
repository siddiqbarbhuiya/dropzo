import fs from 'node:fs';
import path from 'node:path';

const inventory = JSON.parse(fs.readFileSync('audit/stitch-audit/screens-inventory.json', 'utf-8'));
const analysis = [];

for (const s of inventory) {
    if (s.htmlPath && fs.existsSync(s.htmlPath)) {
        const html = fs.readFileSync(s.htmlPath, 'utf-8');

        // Extract title or h1/h2
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
            m[1].replace(/<[^>]+>/g, '').trim(),
        );
        const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
            .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
            .slice(0, 5);
        const buttons = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)]
            .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
            .filter(Boolean)
            .slice(0, 8);
        const inputs = [...html.matchAll(/<input[^>]*placeholder=["']([^"']+)["']/gi)].map(
            (m) => m[1],
        );

        // Detect key UI components / badges / sections
        const hasTable = /<table/i.test(html);
        const hasForms = /<form|<input|<select/i.test(html);
        const hasMapOrLocation = /location|map|delivery address|pin code|badarpur/i.test(html);

        analysis.push({
            id: s.id,
            index: s.index,
            name: s.name,
            deviceType: s.deviceType,
            dimensions: `${s.dimensions.width}x${s.dimensions.height}`,
            pageTitle: titleMatch ? titleMatch[1].trim() : null,
            headings: h1Matches.concat(h2Matches),
            sampleButtons: buttons,
            sampleInputs: inputs,
            hasTable,
            hasForms,
        });
    } else {
        analysis.push({
            id: s.id,
            index: s.index,
            name: s.name,
            deviceType: s.deviceType,
            dimensions: `${s.dimensions.width}x${s.dimensions.height}`,
            note: 'No HTML export (Reference image or non-HTML resource)',
        });
    }
}

fs.writeFileSync(
    'audit/stitch-audit/screens-analysis.json',
    JSON.stringify(analysis, null, 2),
    'utf-8',
);
console.log('Saved detailed HTML analysis to audit/stitch-audit/screens-analysis.json');
