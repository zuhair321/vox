/**
 * Version bump helper.
 *
 *   node scripts/bump-version.cjs patch   # 1.0.2 -> 1.0.3
 *   node scripts/bump-version.cjs minor   # 1.0.2 -> 1.1.0
 *   node scripts/bump-version.cjs major   # 1.0.2 -> 2.0.0
 *
 * Updates the top-level `version` of package.json and ensures the
 * electron-builder config in package.json's `build` picks it up. After bumping
 * the script will commit + tag without pushing — push manually when you're sure.
 */
const fs = require('fs');
const path = require('path');

const rootPkg = path.resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(rootPkg, 'utf-8'));

const bump = (process.argv[2] || 'patch').toLowerCase();
const [major, minor, patch] = (pkg.version || '1.0.0').split('.').map(Number);
let next;
if (bump === 'major') next = [major + 1, 0, 0];
else if (bump === 'minor') next = [major, minor + 1, 0];
else next = [major, minor, patch + 1];

pkg.version = next.join('.');
fs.writeFileSync(rootPkg, JSON.stringify(pkg, null, 2) + '\n');
console.log('Bumped version to', pkg.version);

// Try to git-tag the bump (best effort — won't fail if no git).
try {
  const { execSync } = require('child_process');
  execSync('git add package.json', { stdio: 'inherit' });
  execSync(`git commit -m "chore: bump version to v${pkg.version}"`, { stdio: 'inherit' });
  execSync(`git tag v${pkg.version}`, { stdio: 'inherit' });
  console.log('Tagged v' + pkg.version + ' (push with: git push --follow-tags)');
} catch (err) {
  console.log('Skipped git commit/tag (' + (err && err.message) + ')');
}
