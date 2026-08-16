/**
 * Toh Framework Uninstaller
 *
 * Removes TOH-managed files from a target project.
 *
 * Scoping rules:
 *   --ide codex  -> only Codex-owned TOH files (.codex/skills/toh-* managed
 *                   skills + the AGENTS.md TOH block). `.toh/` is shared
 *                   runtime state and stays — other IDEs may still use it.
 *   (no --ide)   -> full removal: every IDE surface the installer owns,
 *                   plus `.toh/`.
 *
 * User content is never deleted: user skills under .codex/skills, user text
 * in AGENTS.md outside the TOH markers, and files we cannot classify are
 * all left untouched.
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import { join } from 'path';
import { uninstallCodex } from './ide-handlers/codex.js';

export async function uninstall(options) {
  const targetDir = options.target || process.cwd();
  const ides = options.ide
    ? options.ide.split(',').map((i) => i.trim().toLowerCase())
    : null; // null = full uninstall

  console.log(chalk.cyan(`\n🗑️  Uninstalling Toh Framework from ${targetDir}\n`));

  const isCodex = (i) => i === 'codex' || i === 'codex-cli';

  if (ides && !ides.every(isCodex)) {
    const unsupported = ides.filter((i) => !isCodex(i));
    console.log(
      chalk.yellow(
        `  ⚠️  Per-IDE uninstall is currently implemented for Codex only ` +
        `(got: ${unsupported.join(', ')}).`
      )
    );
    console.log(chalk.yellow('     Run without --ide for a full uninstall, or use --ide codex.\n'));
    return;
  }

  // ---- Codex teardown (per-IDE and full uninstall both do this) ----
  const spinner = ora('Removing Codex integration...').start();
  try {
    const { removedSkills, agentsMd } = await uninstallCodex(targetDir);
    const parts = [];
    parts.push(removedSkills.length ? `${removedSkills.length} skill(s) removed` : 'no TOH skills found');
    if (agentsMd === 'updated') parts.push('AGENTS.md block removed');
    if (agentsMd === 'removed') parts.push('AGENTS.md removed (was TOH-only)');
    spinner.succeed(`Codex integration removed (${parts.join(', ')})`);
  } catch (error) {
    spinner.fail(`Failed to remove Codex integration: ${error.message}`);
  }

  if (!ides) {
    // ---- Full uninstall: remaining TOH-owned paths ----
    const fullPaths = [
      join(targetDir, '.toh'),
      join(targetDir, '.claude', 'skills'),
      join(targetDir, '.claude', 'agents'),
      join(targetDir, '.claude', 'commands')
    ];
    const fullSpinner = ora('Removing TOH runtime and IDE resources...').start();
    const removed = [];
    for (const p of fullPaths) {
      if (fs.existsSync(p)) {
        await fs.remove(p);
        removed.push(p.slice(targetDir.length + 1));
      }
    }
    fullSpinner.succeed(
      removed.length
        ? `Removed: ${removed.join(', ')}`
        : 'No TOH runtime found'
    );

    console.log(
      chalk.gray(
        '\n  Note: CLAUDE.md / .cursorrules / .gemini / .agent files are user-shared\n' +
        '  files without TOH markers — review them manually if you installed those IDEs.'
      )
    );
  }

  console.log(chalk.green('\n✅ Uninstall complete.\n'));
}
