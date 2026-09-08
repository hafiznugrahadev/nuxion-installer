#!/usr/bin/env node
/**
 * create-nuxion — scaffold the Nuxion starter kit (NestJS + Nuxt monorepo)
 * into a brand-new project.
 *
 *   bun create nuxion@latest <project-name>
 *
 * Steps:
 *   1. shallow-clone the kit from GitHub into <project-name>
 *   2. throw away .git and start a fresh history — no remotes, so there is
 *      nothing to accidentally push to
 *   3. run the kit's own `scripts/init-project.ts` (rename identity, seed .env)
 *   4. strip kit-internal meta files (dev logs, plans, the init script itself)
 *   5. `bun install`, then the first commit
 *
 * Zero dependencies on purpose: it has to run as a bare `bun create` / npm
 * create generator. The template itself is NOT bundled — it is cloned at
 * runtime, so the scaffolder always matches the kit's main branch and this
 * package only needs republishing when the CLI logic changes.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';

const DEFAULT_REPO = 'https://github.com/hafiznugrahadev/nuxion.git';
const DEFAULT_BRANCH = 'main';

// Kit-internal files that make no sense in a scaffolded project. SPEC.md,
// .github/, docker/ and the rest of scripts/ are kept on purpose.
const STRIP_PATHS = [
  '.zcode',
  'docs/superpowers',
  'LESSON.md',
  'MEMORY.md',
  'ERRORS.md',
  'scripts/init-project.ts',
  'scripts/init-project.spec.ts',
];

const INIT_ENTRY_RE = /^[ \t]*"init":[ \t]*"bun run scripts\/init-project\.ts",?\n/m;
const FIRST_COMMIT_MSG = 'chore: scaffold dari create-nuxion';
const KIT_SLUG = 'nuxion';

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

const USAGE = `${bold('nuxion')} — scaffold monorepo NestJS + Nuxt dari Nuxion starter kit

Pemakaian:
  bun create nuxion@latest <nama-project> [flags]

Flags:
  --branch <ref>    branch/tag template (default: ${DEFAULT_BRANCH})
  --repo <url>      URL clone template (default: repo publik upstream)
  --display <nama>  nama tampilan aplikasi (default: Title Case dari slug)
  --no-install      lewati bun install di akhir
  -h, --help        tampilkan bantuan ini`;

function parseArgs(argv) {
  const opts = {
    dest: undefined,
    repo: DEFAULT_REPO,
    branch: DEFAULT_BRANCH,
    display: undefined,
    install: true,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') opts.help = true;
    else if (arg === '--no-install') opts.install = false;
    else if (arg === '--repo') opts.repo = argv[++i];
    else if (arg.startsWith('--repo=')) opts.repo = arg.slice('--repo='.length);
    else if (arg === '--branch') opts.branch = argv[++i];
    else if (arg.startsWith('--branch=')) opts.branch = arg.slice('--branch='.length);
    else if (arg === '--display') opts.display = argv[++i];
    else if (arg.startsWith('--display=')) opts.display = arg.slice('--display='.length);
    else if (arg.startsWith('--')) throw new Error(`Opsi tidak dikenal: ${arg}`);
    else if (opts.dest === undefined) opts.dest = arg;
    else throw new Error(`Argumen tidak dikenal: ${arg}`);
  }
  return opts;
}

const normalizeSlug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const titleCase = (slug) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** Run a command showing its output live; resolve to the exit code. */
const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, stdio: 'inherit' }).status;

/** Run a command quietly; resolve to trimmed stdout or null on failure. */
const runOut = (cmd, args, cwd) => {
  const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return result.status === 0 ? (result.stdout ?? '').trim() : null;
};

async function stripKitInternals(dest) {
  for (const path of STRIP_PATHS) rmSync(join(dest, path), { recursive: true, force: true });
  // Drop docs/ too when stripping left it empty (it holds kit planning notes).
  const docsDir = join(dest, 'docs');
  if (existsSync(docsDir) && readdirSync(docsDir).length === 0) {
    rmSync(docsDir, { recursive: true });
  }
  const pkgPath = join(dest, 'package.json');
  const pkg = await readFile(pkgPath, 'utf8');
  if (INIT_ENTRY_RE.test(pkg)) {
    await writeFile(pkgPath, pkg.replace(INIT_ENTRY_RE, ''));
  } else {
    console.log(yellow('! Entry "init" tidak ditemukan di package.json (template berubah?) — dilewati.'));
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    console.log(USAGE);
    return;
  }

  // ── 1. Resolve the destination ──────────────────────────────────────────────
  let dest = opts.dest;
  if (dest === undefined) {
    if (!process.stdin.isTTY) {
      throw new Error(`Nama project wajib diisi.\n\n${USAGE}`);
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const fallback = normalizeSlug(basename(process.cwd())) || 'my-app';
      const answer = (await rl.question(`Nama folder project [${fallback}]: `)).trim();
      dest = answer || fallback;
    } finally {
      rl.close();
    }
  }
  dest = resolve(dest);

  const slug = normalizeSlug(basename(dest));
  if (!slug || slug === KIT_SLUG) {
    throw new Error(
      `"${basename(dest)}" tidak bisa dipakai sebagai nama project — pilih nama lain ` +
        `(huruf kecil, angka, dan dash).`,
    );
  }
  const display = opts.display ?? titleCase(slug);

  // ── 2. Preconditions ────────────────────────────────────────────────────────
  if (!runOut('git', ['--version'])) throw new Error('git tidak ditemukan di PATH.');
  if (!runOut('bun', ['--version']))
    throw new Error('bun tidak ditemukan di PATH — install dulu dari https://bun.sh.');
  if (existsSync(dest) && readdirSync(dest).length > 0) {
    throw new Error(`Folder "${dest}" sudah ada dan tidak kosong. Pilih nama lain atau kosongkan dulu.`);
  }

  console.log(bold(`\nScaffold ${display} (${slug}) dari Nuxion\n`));

  // ── 3. Download the template ────────────────────────────────────────────────
  console.log(dim(`→ clone ${opts.repo} (${opts.branch})…`));
  if (run('git', ['clone', '--depth=1', '--branch', opts.branch, opts.repo, dest], process.cwd()) !== 0) {
    throw new Error(
      `Gagal clone dari ${opts.repo}#${opts.branch} — cek koneksi, URL repo, atau nama branch.`,
    );
  }

  // ── 4. Fresh git history, zero remotes ──────────────────────────────────────
  // Removing .git entirely also removes the origin that points at the kit, so
  // a `git push` in the scaffolded project has nowhere to go by accident.
  // Staging everything populates the index — that is what the kit's init
  // script reads with `git ls-files`.
  rmSync(join(dest, '.git'), { recursive: true, force: true });
  execFileSync('git', ['init', '-q'], { cwd: dest });
  execFileSync('git', ['add', '-A'], { cwd: dest });
  const remotes = runOut('git', ['remote'], dest);
  if (remotes) {
    throw new Error(`Remote tak terduga pada repo baru: ${remotes}`);
  }
  console.log(green('✔ riwayat git baru dibuat — tanpa remote (tidak bisa salah push ke repo kit)'));

  // ── 5. Let the kit rename itself ────────────────────────────────────────────
  // Reuses the tested init script: identity rename, slug validation, .env
  // seeding with a generated JWT secret, and its own next-steps output.
  // --force skips its uncommitted-changes guard, which can never pass here:
  // a repo with staged files but no HEAD reports every file as staged.
  console.log(dim('→ jalankan init (rename identitas + tulis .env)…'));
  const initArgs = ['run', 'scripts/init-project.ts', '--name', slug, '--yes', '--force'];
  if (opts.display !== undefined) initArgs.push('--display', opts.display);
  if (run('bun', initArgs, dest) !== 0) {
    throw new Error(`init gagal — folder ${dest} dibiarkan untuk inspeksi (lihat output di atas).`);
  }

  // ── 6. Strip kit-internal files ─────────────────────────────────────────────
  await stripKitInternals(dest);
  console.log(green('✔ meta-dok & script init kit dihapus'));

  // ── 7. Install ──────────────────────────────────────────────────────────────
  if (opts.install) {
    console.log(dim('→ bun install…'));
    if (run('bun', ['install'], dest) !== 0) {
      console.log(yellow('! bun install gagal — jalankan manual nanti.'));
    }
  }

  // ── 8. First commit (best-effort) ───────────────────────────────────────────
  execFileSync('git', ['add', '-A'], { cwd: dest });
  if (run('git', ['commit', '-q', '-m', FIRST_COMMIT_MSG], dest) !== 0) {
    console.log(yellow('! Commit awal gagal (mis. git user.name/email belum diset) — commit sendiri nanti.'));
  }

  // ── 9. Summary ──────────────────────────────────────────────────────────────
  console.log(`
${green('✔')} ${bold(display)} siap di ./${basename(dest)}

${bold('Langkah berikutnya')}
  cd ${basename(dest)}
  docker compose up -d                                        ${dim('# Postgres + Redis')}
  bun run --filter @${slug}/api prisma:generate               ${dim('# generated client masih menyimpan nama lama')}
  bun run --filter @${slug}/api prisma:deploy                 ${dim('# apply migrations')}
  bun run --filter @${slug}/api db:seed
  bun run serve                                               ${dim('# API + Web')}
`);
}

main().catch((error) => {
  console.error(red(`✖ ${error.message}`));
  process.exit(1);
});
