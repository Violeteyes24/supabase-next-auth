// build-no-lint.js
const { execSync } = require('child_process');

try {
  execSync('next build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}