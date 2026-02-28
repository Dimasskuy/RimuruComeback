#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(['.git', 'node_modules']);
const TARGET_EXT = new Set(['.js', '.json', '.md', '.sh', '.txt', '.yml', '.yaml']);
const ASSET_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ttf', '.otf', '.mp3', '.wav']);

function walk(dir) {
  let out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(walk(full));
    else out.push(full);
  }
  return out;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const files = walk(ROOT);
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');
const codeFiles = files.filter(f => TARGET_EXT.has(path.extname(f)));
const patternScanFiles = files.filter(f => ['.js', '.json', '.sh', '.yml', '.yaml'].includes(path.extname(f)));
const jsAbsoluteFiles = files.filter(f => f.endsWith('.js'));
const jsRelativeFiles = jsAbsoluteFiles.map(rel);
const assetRelativeFiles = files.filter(f => ASSET_EXT.has(path.extname(f).toLowerCase())).map(rel);

const byTopFolder = new Map();
for (const f of files) {
  const r = rel(f);
  const seg = r.split('/')[0] || '.';
  byTopFolder.set(seg, (byTopFolder.get(seg) || 0) + 1);
}

const patterns = {
  syncFs: /fs\.(readFileSync|writeFileSync|appendFileSync|unlinkSync|rmSync|readdirSync|statSync|existsSync|renameSync|mkdirSync)\(/g,
  setInterval: /setInterval\(/g,
  childProcessExec: /\bexec\(|execSync\(/g,
  tlsDisabled: /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]/g,
  hardcodedMongo: /mongodb\+srv:\/\//g,
  secretLike: /(api[_-]?key|token|password|passwd|secret)\s*[:=]\s*['"][^'"]+['"]/gi,
};

const findings = {};
for (const [name] of Object.entries(patterns)) findings[name] = [];

for (const f of patternScanFiles) {
  const text = read(f);
  const r = rel(f);
  for (const [name, regex] of Object.entries(patterns)) {
    const matches = text.match(regex);
    if (matches?.length) findings[name].push({ file: r, count: matches.length });
  }
}

const jsFiles = jsAbsoluteFiles.map(f => {
  const text = read(f);
  return {
    file: rel(f),
    lines: text.split(/\r?\n/).length,
    bytes: Buffer.byteLength(text)
  };
}).sort((a, b) => b.lines - a.lines);

// Build lightweight static reference index (string-based, conservative)
const referencedByCode = new Map();
for (const f of jsAbsoluteFiles) {
  const source = read(f);
  const r = rel(f);

  const refs = new Set();

  // direct require/import literals
  const reqRe = /require\((['"])([^'"]+)\1\)/g;
  const importRe = /from\s+(['"])([^'"]+)\1/g;
  const dynStringRe = /(['"])([^'"]+\.(?:js|json|ttf|otf|png|jpg|jpeg|webp|gif|mp3|wav))\1/g;

  for (const re of [reqRe, importRe]) {
    let m;
    while ((m = re.exec(source))) refs.add(m[2]);
  }

  // also track raw path-like strings with extension (for assets)
  let dm;
  while ((dm = dynStringRe.exec(source))) refs.add(dm[2]);

  // resolve relative module refs to absolute relative paths
  const baseDir = path.dirname(r);
  for (const refPath of refs) {
    if (refPath.startsWith('.')) {
      const candidate = path.normalize(path.join(baseDir, refPath)).replace(/\\/g, '/');
      const withJs = candidate.endsWith('.js') ? candidate : `${candidate}.js`;
      const withJson = candidate.endsWith('.json') ? candidate : `${candidate}.json`;
      if (jsRelativeFiles.includes(candidate)) referencedByCode.set(candidate, (referencedByCode.get(candidate) || 0) + 1);
      if (jsRelativeFiles.includes(withJs)) referencedByCode.set(withJs, (referencedByCode.get(withJs) || 0) + 1);
      if (codeFiles.map(rel).includes(withJson)) referencedByCode.set(withJson, (referencedByCode.get(withJson) || 0) + 1);
    } else {
      // non-relative refs: attempt suffix matching for known assets under src/
      for (const asset of assetRelativeFiles) {
        if (asset.endsWith(refPath)) referencedByCode.set(asset, (referencedByCode.get(asset) || 0) + 1);
      }
    }
  }
}

const entryPoints = new Set([
  'index.js',
  'config.js',
  'handler.js',
  'scripts/audit.js',
]);

const dynamicLoadSafePrefixes = [
  'plugins/', // loaded dynamically from directory scan
];

function isDynamicallyLoaded(file) {
  return dynamicLoadSafePrefixes.some(prefix => file.startsWith(prefix));
}

const potentiallyUnusedJs = jsRelativeFiles
  .filter(file => !entryPoints.has(file))
  .filter(file => !isDynamicallyLoaded(file))
  .filter(file => (referencedByCode.get(file) || 0) === 0)
  .slice(0, 200);

const potentiallyUnusedAssets = assetRelativeFiles
  .filter(file => (referencedByCode.get(file) || 0) === 0)
  .slice(0, 200);

const report = {
  generatedAt: new Date().toISOString(),
  notes: {
    unusedDetection: 'Conservative static scan. Dynamic path construction may produce false positives. DO NOT delete directly without manual validation.',
  },
  totals: {
    files: files.length,
    jsFiles: jsFiles.length,
    codeFiles: codeFiles.length,
    assetFiles: assetRelativeFiles.length,
  },
  folders: Object.fromEntries([...byTopFolder.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
  largestJsByLines: jsFiles.slice(0, 25),
  findings,
  unusedCandidates: {
    js: {
      count: potentiallyUnusedJs.length,
      files: potentiallyUnusedJs,
    },
    assets: {
      count: potentiallyUnusedAssets.length,
      files: potentiallyUnusedAssets,
    },
  },
};

const outDir = path.join(ROOT, 'docs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'audit-report.json');
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

console.log(`Audit written to ${rel(outFile)}`);
console.log(`Total files: ${report.totals.files}, JS files: ${report.totals.jsFiles}, assets: ${report.totals.assetFiles}`);
for (const [k, v] of Object.entries(findings)) {
  const total = v.reduce((n, it) => n + it.count, 0);
  console.log(`${k}: ${total}`);
}
console.log(`unusedCandidates.js: ${report.unusedCandidates.js.count}`);
console.log(`unusedCandidates.assets: ${report.unusedCandidates.assets.count}`);
