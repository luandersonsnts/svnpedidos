import { execSync } from 'node:child_process';

const raw = (process.env.SKIP_BUILD || '').toLowerCase();
const skip = raw === 'true' || raw === '1' || raw === 'yes';

if (skip) {
  console.log('[buildpack] SKIP_BUILD=true: skipping "npm run build" for backend service.');
  process.exit(0);
}

console.log('[buildpack] Running "npm run build"...');
execSync('npm run build', { stdio: 'inherit' });