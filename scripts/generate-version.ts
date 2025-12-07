/**
 * Generate version.ts with build info from git
 *
 * This script runs during prebuild to auto-generate version info:
 * - Base version from package.json
 * - Build number from git commit count
 * - Git short hash for identification
 *
 * Usage: npx ts-node scripts/generate-version.ts
 */

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface PackageJson {
  version: string;
}

function getGitInfo(): { commitCount: number; shortHash: string } {
  try {
    // Get commit count (safer than exec - no shell injection possible)
    const commitCountStr = execFileSync('git', ['rev-list', '--count', 'HEAD'], {
      encoding: 'utf-8',
      cwd: process.cwd(),
    }).trim();

    // Get short hash
    const shortHash = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf-8',
      cwd: process.cwd(),
    }).trim();

    return {
      commitCount: parseInt(commitCountStr, 10) || 0,
      shortHash: shortHash || 'unknown',
    };
  } catch {
    console.warn('Warning: Could not get git info, using defaults');
    return { commitCount: 0, shortHash: 'unknown' };
  }
}

function generateVersion(): void {
  // Read base version from package.json
  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const baseVersion = packageJson.version;

  // Get git info
  const { commitCount, shortHash } = getGitInfo();

  // Get current date in YYYY-MM-DD format
  const buildDate = new Date().toISOString().split('T')[0];

  // Generate version string: major.minor.patch+buildNumber
  const fullVersion = `${baseVersion}+${commitCount}`;

  const content = `/**
 * Auto-generated version file
 * DO NOT EDIT - This file is generated during build
 * Generated: ${new Date().toISOString()}
 */

export const APP_VERSION = {
  /** Semantic version from package.json */
  version: '${baseVersion}',

  /** Build number (git commit count) */
  build: ${commitCount},

  /** Git short hash */
  hash: '${shortHash}',

  /** Build date */
  buildDate: '${buildDate}',

  /** Display version (e.g., "v0.1.0+123") */
  get display(): string {
    return \`v\${this.version}+\${this.build}\`;
  },

  /** Full version with hash (e.g., "v0.1.0+123 (abc1234)") */
  get full(): string {
    return \`v\${this.version}+\${this.build} (\${this.hash})\`;
  },

  /** Version with date (e.g., "v0.1.0+123 (2025-12-07)") */
  get withDate(): string {
    return \`v\${this.version}+\${this.build} (\${this.buildDate})\`;
  },
};
`;

  // Write to version.ts
  const outputPath = join(process.cwd(), 'src', 'app', 'config', 'version.ts');
  writeFileSync(outputPath, content, 'utf-8');

  console.log(`✓ Generated version: ${fullVersion} (${shortHash})`);
}

generateVersion();
