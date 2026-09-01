/**
 * List Command
 * Prints the live catalog — commands, agents, skills — by reading src/ at
 * runtime. Nothing here is hardcoded: src/ is the single source of truth,
 * so counts and descriptions can never go stale again.
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', 'src');

/** Parse YAML frontmatter from a markdown file. Throws on invalid YAML —
 *  a broken source file is a repo bug that must surface, never be hidden. */
function parseFrontmatter(raw, filePath) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  try {
    return yaml.load(match[1]) || {};
  } catch (err) {
    throw new Error(`Invalid YAML frontmatter in ${filePath}: ${err.message}`);
  }
}

/** One-line summary: collapse whitespace, cut at the first sentence end
 *  past minLen, clip to maxLen. */
function summarize(text, maxLen = 72) {
  if (!text) return '';
  const flat = String(text).replace(/\s+/g, ' ').trim();
  const period = flat.indexOf('. ');
  const cut = period > 20 && period < maxLen ? flat.slice(0, period + 1) : flat;
  return cut.length > maxLen ? cut.slice(0, maxLen - 1).trimEnd() + '…' : cut;
}

async function readCommands() {
  const dir = join(SRC_DIR, 'commands');
  const files = (await fs.readdir(dir)).filter(
    (f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md'
  );
  const commands = [];
  for (const file of files) {
    const raw = await fs.readFile(join(dir, file), 'utf-8');
    const fm = parseFrontmatter(raw, join(dir, file));
    commands.push({
      cmd: fm.command || `/${file.replace(/\.md$/, '')}`,
      short: Array.isArray(fm.aliases) && fm.aliases.length > 0 ? fm.aliases[0] : '-',
      desc: summarize(fm.description),
    });
  }
  // /toh (smart command) first, the rest alphabetical.
  commands.sort((a, b) =>
    a.cmd === '/toh' ? -1 : b.cmd === '/toh' ? 1 : a.cmd.localeCompare(b.cmd)
  );
  return commands;
}

async function readAgents() {
  const dir = join(SRC_DIR, 'agents');
  const files = (await fs.readdir(dir)).filter(
    (f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md'
  );
  const agents = [];
  for (const file of files) {
    const raw = await fs.readFile(join(dir, file), 'utf-8');
    const fm = parseFrontmatter(raw, join(dir, file));
    agents.push({
      name: fm.name || file.replace(/\.md$/, ''),
      desc: summarize(fm.description),
      model: fm.model || 'sonnet',
    });
  }
  agents.sort((a, b) => a.name.localeCompare(b.name));
  return agents;
}

async function readSkills() {
  const dir = join(SRC_DIR, 'skills');
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(dir, entry.name, 'SKILL.md');
    if (!(await fs.pathExists(skillFile))) continue;
    const raw = await fs.readFile(skillFile, 'utf-8');
    const fm = parseFrontmatter(raw, skillFile);
    skills.push({
      name: fm.name || entry.name,
      desc: summarize(fm.description),
    });
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

export async function list() {
  const [commands, agents, skills] = await Promise.all([
    readCommands(),
    readAgents(),
    readSkills(),
  ]);

  console.log(chalk.cyan(`\n📋 Toh Framework — ${commands.length} Commands\n`));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────────'));
  for (const c of commands) {
    console.log(
      `  ${chalk.green(c.cmd.padEnd(14))} ${chalk.gray(c.short.padEnd(10))} ${chalk.white(c.desc)}`
    );
  }
  console.log(chalk.gray('  ─────────────────────────────────────────────────────────'));

  console.log(chalk.cyan(`\n🤖 Agents (${agents.length}):\n`));
  for (const a of agents) {
    console.log(
      `  • ${chalk.yellow(a.name.padEnd(20))} ${chalk.gray(`[${a.model}]`.padEnd(9))} ${chalk.white(a.desc)}`
    );
  }

  console.log(chalk.cyan(`\n📚 Skills (${skills.length}):\n`));
  for (const s of skills) {
    console.log(`  • ${chalk.magenta(s.name.padEnd(24))} ${chalk.white(s.desc)}`);
  }

  console.log(
    chalk.gray(
      `\n  Total: ${commands.length} commands · ${agents.length} agents · ${skills.length} skills (read live from src/)\n`
    )
  );
}
