#!/usr/bin/env node

import crypto from 'crypto';

const generateSecret = (length = 64) => {
  return crypto.randomBytes(length).toString('hex');
};

console.log('# Generated using: node scripts/generate-secrets.js');
console.log('# These are example secrets - generate new ones for production!');
console.log('');
console.log(`JWT_SECRET=${generateSecret()}`);
console.log(`SESSION_SECRET=${generateSecret()}`);
console.log('');
console.log('# Copy these values to your .env file');

