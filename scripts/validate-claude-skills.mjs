#!/usr/bin/env node
// Validates .claude/skills/*/SKILL.md structure, required metadata, and doc links.
// Cross-platform (plain Node.js, no OS-specific commands) - run with: node scripts/validate-claude-skills.mjs
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const skillsDir = join(repoRoot, '.claude', 'skills');

let errors = 0;
let warnings = 0;

function fail(msg) {
    console.error(`ERROR: ${msg}`);
    errors++;
}

function warn(msg) {
    console.warn(`WARN:  ${msg}`);
    warnings++;
}

function parseFrontmatter(content, file) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!match) {
        fail(`${file}: missing YAML frontmatter (--- ... ---) block`);
        return null;
    }
    const fm = {};
    for (const line of match[1].split(/\r?\n/)) {
        const m = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
        if (m) fm[m[1]] = m[2].replace(/^"(.*)"$/, '$1').trim();
    }
    return fm;
}

function findDocLinks(body) {
    // Strip fenced code blocks and inline code spans first, so a literal example like
    // `[text](path)` inside backticks in prose isn't mistaken for a real Markdown link.
    const withoutFences = body.replace(/```[\s\S]*?```/g, '');
    const withoutInlineCode = withoutFences.replace(/`[^`\n]*`/g, '');
    const links = [];
    const re = /\[[^\]]*\]\(([^)]+)\)/g;
    let m;
    while ((m = re.exec(withoutInlineCode))) {
        const target = m[1].split('#')[0];
        if (!target || /^https?:\/\//.test(target)) continue;
        links.push(target);
    }
    return links;
}

if (!existsSync(skillsDir)) {
    console.log('No .claude/skills directory found - nothing to validate.');
    process.exit(0);
}

const skillDirs = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
const seenNames = new Map();

for (const dir of skillDirs) {
    const skillFile = join(skillsDir, dir, 'SKILL.md');
    if (!existsSync(skillFile)) {
        fail(`${dir}: no SKILL.md found in .claude/skills/${dir}/`);
        continue;
    }
    const content = readFileSync(skillFile, 'utf8');
    const relPath = `.claude/skills/${dir}/SKILL.md`;
    const fm = parseFrontmatter(content, relPath);
    if (!fm) continue;

    if (!fm.name) {
        fail(`${relPath}: frontmatter missing required "name" field`);
    } else if (fm.name !== dir) {
        warn(`${relPath}: frontmatter name "${fm.name}" does not match directory name "${dir}"`);
    }

    if (!fm.description) {
        fail(`${relPath}: frontmatter missing recommended "description" field`);
    } else if (fm.description.length < 20) {
        warn(
            `${relPath}: description is very short (${fm.description.length} chars) - may not trigger reliably`,
        );
    }

    if (fm.name) {
        if (seenNames.has(fm.name)) {
            fail(`Duplicate skill name "${fm.name}": ${seenNames.get(fm.name)} and ${relPath}`);
        } else {
            seenNames.set(fm.name, relPath);
        }
    }

    // Check for obvious secret-like patterns (defence in depth, not a substitute for real secret scanning).
    if (/(api[_-]?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{12,}['"]/i.test(content)) {
        fail(
            `${relPath}: contains a pattern resembling a hardcoded secret - review before committing`,
        );
    }

    // Check relative documentation links actually resolve.
    for (const link of findDocLinks(content)) {
        if (link.startsWith('/')) continue; // not used in this repo's docs, skip absolute paths
        const resolved = resolve(join(skillsDir, dir), link);
        if (!existsSync(resolved)) {
            fail(
                `${relPath}: broken link to "${link}" (resolved: ${resolved.replace(repoRoot, '.')})`,
            );
        }
    }
}

console.log(`\nChecked ${skillDirs.length} skill(s) in .claude/skills/.`);
console.log(`${errors} error(s), ${warnings} warning(s).`);
process.exit(errors > 0 ? 1 : 0);
