/**
 * Setup test users for E2E tests
 * Playwright globalSetup - runs before all tests
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

async function globalSetup() {
  try {
    console.log('Setting up test users for E2E tests...');
    
    const backendDir = path.resolve(__dirname, '../backend');
    const seedScript = path.join(backendDir, 'scripts/seed-test-users.js');
    
    // Run the seed script from backend
    const { stdout, stderr } = await execAsync(
      `node "${seedScript}"`,
      { cwd: backendDir }
    );
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('already exists')) {
      console.error(stderr);
    }
    
    console.log('Test users setup complete!');
  } catch (error) {
    console.error('Error setting up test users:', error.message);
    // Don't fail tests if users already exist or script has minor issues
    if (!error.message.includes('already exists') && !error.stderr?.includes('already exists')) {
      console.warn('Warning: Could not set up test users. Tests may be skipped.');
    }
  }
}

module.exports = globalSetup;

