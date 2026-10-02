#!/usr/bin/env node
/**
 * check-secrets.js
 * Blocks commits that hardcode credentials. SEDC credentials must only come from
 * .env (development) or the Vercel Environment Variables (production).
 *
 * Usage:
 *   node scripts/check-secrets.js           → checks the staged changes (pre-commit hook)
 *   node scripts/check-secrets.js --all     → checks every tracked file
 */
import { execFileSync } from 'child_process';

// execFileSync with argument arrays: file names never go through a shell
const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const RULES = [
  {
    // env.SEDC_PASSWORD || 'value' / process.env.SEDC_USERNAME ?? "value"
    name: 'Credential env var with a hardcoded fallback',
    regex: /\b(SEDC_[A-Z_]*(PASSWORD|USERNAME|USER|TOKEN|SECRET))\b\s*(\|\||\?\?)\s*['"`][^'"`\s]+['"`]/,
  },
  {
    // password: 'value', const password = "value", PASSWORD="value"
    name: 'Hardcoded password literal',
    regex: /\b(password|passwd|pwd|secret|api[_-]?key|token)\b\s*[:=]\s*['"`][^'"`\s]{4,}['"`]/i,
  },
  {
    name: 'Credentials embedded in a URL',
    regex: /https?:\/\/[^\s/:@'"`]+:[^\s/@'"`]+@/,
  },
];

// Placeholders and empty values used in docs/templates are allowed
const ALLOWED_VALUES = /['"`](tu_[a-z_ñ]+|your[_-][a-z_-]+|changeme|\*{3}REMOVED\*{3}|<[^>]+>)['"`]/i;
const IGNORED_PATHS = [/^node_modules\//, /^dist\//, /package-lock\.json$/, /^scripts\/check-secrets\.js$/];
// .env files are git-ignored; .env.example must only hold placeholders, so it is checked too

function changedLines(all) {
  if (all) {
    const files = git(['ls-files']).split('\n').filter(Boolean);
    return files.flatMap((file) => {
      let content = '';
      try {
        content = git(['show', `:${file}`]);
      } catch {
        return [];
      }
      return content.split('\n').map((text, i) => ({ file, line: i + 1, text }));
    });
  }

  // Only lines added in the staged diff
  const diff = git(['diff', '--cached', '--unified=0', '--no-color']);
  const out = [];
  let file = null;
  let line = 0;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ ')) {
      file = raw.startsWith('+++ b/') ? raw.slice(6) : null;
    } else if (raw.startsWith('@@')) {
      line = Number(/\+(\d+)/.exec(raw)?.[1] || 0);
    } else if (file && raw.startsWith('+')) {
      out.push({ file, line, text: raw.slice(1) });
      line++;
    }
  }
  return out;
}

const all = process.argv.includes('--all');
const findings = [];
for (const { file, line, text } of changedLines(all)) {
  if (IGNORED_PATHS.some((re) => re.test(file))) continue;
  for (const rule of RULES) {
    if (rule.regex.test(text) && !ALLOWED_VALUES.test(text)) {
      findings.push({ file, line, rule: rule.name });
    }
  }
}

if (findings.length) {
  console.error('\n✖ Commit bloqueado: se detectaron credenciales escritas en el código.\n');
  findings.forEach((f) => console.error(`  ${f.file}:${f.line}  →  ${f.rule}`));
  console.error('\nLas credenciales deben leerse solo de .env (desarrollo) o de las variables de entorno de Vercel.');
  console.error('Ejemplo correcto: const password = env.SEDC_PASSWORD || \'\';\n');
  process.exit(1);
}
console.log(all ? '✔ Sin credenciales en los archivos versionados.' : '✔ Sin credenciales en los cambios del commit.');
