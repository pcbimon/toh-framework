/**
 * Status Command
 * Check installation status
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import { join } from 'path';
import os from 'os';

export async function status() {
  console.log(chalk.cyan('\n📊 Toh Framework - Installation Status\n'));
  
  const cwd = process.cwd();
  const homeDir = os.homedir();
  
  // Check global installation (in home directory)
  console.log(chalk.white('  Global Installation (~/.claude/):'));
  console.log(chalk.gray('  ─────────────────────────────────────────────'));
  
  const globalPaths = [
    { path: join(homeDir, '.claude', 'skills'), name: 'Skills' },
    { path: join(homeDir, '.claude', 'agents'), name: 'Agents' },
    { path: join(homeDir, '.claude', 'commands'), name: 'Commands' }
  ];

  for (const p of globalPaths) {
    if (fs.existsSync(p.path)) {
      const files = await countFiles(p.path);
      console.log(`  ${chalk.green('✓')} ${p.name.padEnd(12)} ${chalk.gray(`(${files} files)`)}`);
    } else {
      console.log(`  ${chalk.red('✗')} ${p.name.padEnd(12)} ${chalk.gray('not installed')}`);
    }
  }

  // Check project installation
  console.log(chalk.white('\n  Project Installation (./ ):'));
  console.log(chalk.gray('  ─────────────────────────────────────────────'));
  
  const projectPaths = [
    { path: join(cwd, '.claude'), name: '.claude/' },
    { path: join(cwd, '.cursor', 'rules'), name: '.cursor/rules/' },
    { path: join(cwd, '.agents', 'skills'), name: '.agents/skills/' },
    { path: join(cwd, '.codex', 'config.toml'), name: '.codex/config.toml' },
    { path: join(cwd, '.toh'), name: '.toh/' },
    { path: join(cwd, 'CLAUDE.md'), name: 'CLAUDE.md' },
    { path: join(cwd, 'AGENTS.md'), name: 'AGENTS.md' },
    { path: join(cwd, '.cursorrules'), name: '.cursorrules' }
  ];

  for (const p of projectPaths) {
    if (fs.existsSync(p.path)) {
      if (fs.lstatSync(p.path).isDirectory()) {
        const files = await countFiles(p.path);
        console.log(`  ${chalk.green('✓')} ${p.name.padEnd(18)} ${chalk.gray(`(${files} files)`)}`);
      } else {
        console.log(`  ${chalk.green('✓')} ${p.name.padEnd(18)} ${chalk.gray('exists')}`);
      }
    } else {
      console.log(`  ${chalk.gray('○')} ${p.name.padEnd(18)} ${chalk.gray('not found')}`);
    }
  }

  // Check manifest
  const manifestPath = join(cwd, '.toh', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    console.log(chalk.white('\n  Installation Details:'));
    console.log(chalk.gray('  ─────────────────────────────────────────────'));
    
    const manifest = await fs.readJson(manifestPath);
    console.log(`  Version:      ${chalk.cyan(manifest.version)}`);
    console.log(`  Installed:    ${chalk.gray(manifest.installedAt)}`);
    console.log(`  IDEs:         ${chalk.yellow(manifest.ides?.join(', ') || 'N/A')}`);
  }

  console.log(chalk.gray('\n  ─────────────────────────────────────────────'));
  console.log(chalk.white('\n  💡 Run ') + chalk.green('npx toh-framework install') + chalk.white(' to install or update'));
  console.log('');
}

async function countFiles(dir) {
  let count = 0;
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        count += await countFiles(join(dir, item.name));
      } else {
        count++;
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return count;
}
