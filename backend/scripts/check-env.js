#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');

const REQUIRED_BACKEND_VARS = [
  'DATABASE_URL',
  'MONGODB_URI',
  'REDIS_URL',
  'FIREBASE_SERVICE_ACCOUNT',
  'FIREBASE_STORAGE_BUCKET',
  'JWT_SECRET',
  'SESSION_SECRET',
  'NODE_ENV',
  'PORT',
  'CORS_ORIGIN',
];

const OPTIONAL_BACKEND_VARS = [
  'REDIS_HOST',
  'REDIS_PORT',
  'JWT_EXPIRES_IN',
  'SESSION_MAX_AGE',
  'API_VERSION',
  'LOG_LEVEL',
  'LOG_DIR',
  'KAFKA_BROKERS',
];

const REQUIRED_FRONTEND_VARS = [
  'VITE_API_BASE_URL',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const OPTIONAL_FRONTEND_VARS = [
  'VITE_API_VERSION',
];

function parseEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const vars = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          vars[key] = value;
        }
      }
    }
    
    return vars;
  } catch (error) {
    return null;
  }
}

function checkEnv(filePath, required, optional, name) {
  const vars = parseEnvFile(filePath);
  
  if (!vars) {
    console.log(`\n[ERROR] ${name} .env file not found at: ${filePath}`);
    return { missing: required, found: [], optional: [] };
  }
  
  const found = [];
  const missing = [];
  const optionalFound = [];
  const optionalMissing = [];
  
  for (const req of required) {
    if (vars[req] && vars[req].trim() !== '' && !vars[req].includes('[PASSWORD]') && !vars[req].includes('[YOUR-')) {
      found.push(req);
    } else {
      missing.push(req);
    }
  }
  
  for (const opt of optional) {
    if (vars[opt] && vars[opt].trim() !== '' && !vars[opt].includes('[PASSWORD]') && !vars[opt].includes('[YOUR-')) {
      optionalFound.push(opt);
    } else {
      optionalMissing.push(opt);
    }
  }
  
  return { found, missing, optionalFound, optionalMissing };
}

console.log('Environment Variables Check');
console.log('===========================\n');

const backendPath = join(PROJECT_ROOT, 'backend/.env');
const frontendPath = join(PROJECT_ROOT, 'frontend/.env');

const backendCheck = checkEnv(backendPath, REQUIRED_BACKEND_VARS, OPTIONAL_BACKEND_VARS, 'Backend');
const frontendCheck = checkEnv(frontendPath, REQUIRED_FRONTEND_VARS, OPTIONAL_FRONTEND_VARS, 'Frontend');

console.log('BACKEND .env');
console.log('------------');
if (backendCheck.missing.length === 0) {
  console.log('[OK] All required variables are filled!');
} else {
  console.log(`[WARN] Missing ${backendCheck.missing.length} required variable(s):`);
  backendCheck.missing.forEach(v => console.log(`   - ${v}`));
}

if (backendCheck.found.length > 0) {
  console.log(`\n[OK] Found ${backendCheck.found.length} required variable(s):`);
  backendCheck.found.forEach(v => console.log(`   [OK] ${v}`));
}

if (backendCheck.optionalFound.length > 0) {
  console.log(`\n[INFO] Optional variables found (${backendCheck.optionalFound.length}):`);
  backendCheck.optionalFound.forEach(v => console.log(`   [OK] ${v}`));
}

console.log('\nFRONTEND .env');
console.log('-------------');
if (frontendCheck.missing.length === 0) {
  console.log('[OK] All required variables are filled!');
} else {
  console.log(`[WARN] Missing ${frontendCheck.missing.length} required variable(s):`);
  frontendCheck.missing.forEach(v => console.log(`   - ${v}`));
}

if (frontendCheck.found.length > 0) {
  console.log(`\n[OK] Found ${frontendCheck.found.length} required variable(s):`);
  frontendCheck.found.forEach(v => console.log(`   [OK] ${v}`));
}

if (frontendCheck.optionalFound.length > 0) {
  console.log(`\n[INFO] Optional variables found (${frontendCheck.optionalFound.length}):`);
  frontendCheck.optionalFound.forEach(v => console.log(`   [OK] ${v}`));
}

console.log('\n===========================');
const totalMissing = backendCheck.missing.length + frontendCheck.missing.length;
if (totalMissing === 0) {
  console.log('[OK] All required environment variables are configured!');
  process.exit(0);
} else {
  console.log(`[WARN] Total missing: ${totalMissing} required variable(s)`);
  console.log('\nSee SETUP_CHECKLIST.md for details on how to obtain these values.');
  process.exit(1);
}

