import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(fs.readFileSync(path.join(root, 'design/yor-tokens.json'), 'utf8'));
const css = fs.readFileSync(path.join(root, 'frontend/css/style.css'), 'utf8').toLowerCase();
const index = fs.readFileSync(path.join(root, 'frontend/index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

const colors = [...Object.values(tokens.palette), ...tokens.gradient];
const missingColors = colors.filter((color) => !css.includes(color));
if (missingColors.length) {
  throw new Error(`Missing YOR colors in frontend CSS: ${missingColors.join(', ')}`);
}

for (const state of tokens.evidenceStates) {
  if (!readme.includes(`\`${state}\``) && !index.includes(state)) {
    throw new Error(`Missing evidence state: ${state}`);
  }
}

if (!index.includes('YOR STATUS') || !index.includes('theme-color')) {
  throw new Error('Missing YOR document identity or theme metadata');
}

process.stdout.write('YOR design contract: PASS\n');
