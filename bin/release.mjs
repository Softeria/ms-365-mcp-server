#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

try {
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  if (currentBranch !== 'main') {
    console.error(
      `Error: You must be on the 'main' branch to create a release. Current branch: ${currentBranch}`
    );
    process.exit(1);
  }
} catch (error) {
  console.error('Failed to determine current git branch:', error.message);
  process.exit(1);
}

try {
  const changes = execSync('git status --porcelain').toString();
  if (changes.length > 0) {
    console.error(
      'Error: You have uncommitted changes. Please commit or stash them before creating a release.'
    );
    console.error(changes);
    process.exit(1);
  }
} catch (error) {
  console.error('Failed to check git status:', error.message);
  process.exit(1);
}

const args = process.argv.slice(2);
const releaseType = args[0] || 'patch';

if (!['major', 'minor', 'patch'].includes(releaseType)) {
  console.error('Invalid release type. Must be one of: major, minor, patch');
  process.exit(1);
}

console.log(`Release type: ${releaseType}`);

console.log('Running tests...');
try {
  execSync('npm test', { stdio: 'inherit' });
} catch (error) {
  console.error('Tests failed! Aborting release.');
  process.exit(1);
}

console.log(`Bumping ${releaseType} version...`);
execSync(`npm version --no-git-tag-version ${releaseType}`);

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

console.log('Committing version change...');
execSync('git add package.json package-lock.json');
execSync(`git commit -m "Bump version to ${version}"`);

console.log('Pushing to remote...');
execSync('git push');

console.log(`Creating GitHub release for v${version}...`);
execSync(`gh release create v${version} --title 'v${version}' --notes 'Version ${version}'`, {
  stdio: 'inherit',
});

console.log(`Release v${version} created successfully!`);
