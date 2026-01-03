# Security Secrets Guide

## Overview

This project uses two critical secrets for security:
1. **JWT_SECRET** - For signing and verifying JWT authentication tokens
2. **SESSION_SECRET** - For signing Express session cookies

## JWT_SECRET

### What is JWT_SECRET?

`JWT_SECRET` is a cryptographic key used to:
- **Sign** JWT tokens when users log in (in `auth.service.js`)
- **Verify** JWT tokens in protected routes (in `auth.js` middleware)

### How it works:

1. **Token Signing** (Login):
   ```javascript
   jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
   ```
   Creates a token that includes user info (id, email, role) and is cryptographically signed.

2. **Token Verification** (Protected Routes):
   ```javascript
   jwt.verify(token, JWT_SECRET)
   ```
   Verifies the token hasn't been tampered with and extracts user info.

### Security Requirements:

- **Minimum 32 characters** (recommended: 64+ characters)
- **Random and unpredictable** - Never use predictable values
- **Different from SESSION_SECRET** - Use separate secrets
- **Keep secret** - Never commit to git or expose in client-side code
- **Rotate periodically** - Change in production if compromised

## SESSION_SECRET

### What is SESSION_SECRET?

`SESSION_SECRET` is used by Express sessions to:
- **Sign** session cookies to prevent tampering
- **Encrypt** session data stored in cookies

### How it works:

Express uses this secret to cryptographically sign session cookies, ensuring:
- Cookies haven't been modified by clients
- Session data integrity is maintained

### Security Requirements:

- **Minimum 32 characters** (recommended: 64+ characters)
- **Random and unpredictable**
- **Different from JWT_SECRET**
- **Keep secret** - Never expose publicly

## Generating Secrets

### Option 1: Using the provided script

```bash
cd backend
node scripts/generate-secrets.js
```

This generates cryptographically secure random secrets using Node.js `crypto.randomBytes()`.

### Option 2: Using Node.js directly

```bash
node -e "const crypto = require('crypto'); console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex')); console.log('SESSION_SECRET=' + crypto.randomBytes(64).toString('hex'));"
```

### Option 3: Using OpenSSL

```bash
openssl rand -hex 64  # For JWT_SECRET
openssl rand -hex 64  # For SESSION_SECRET
```

## Best Practices

1. **Generate unique secrets** for each environment (dev, staging, production)
2. **Use environment variables** - Never hardcode secrets in code
3. **Rotate secrets** if compromised or periodically (requires re-authentication)
4. **Use strong random generation** - Always use cryptographically secure random generators
5. **Store securely** - Use secret management services in production (AWS Secrets Manager, HashiCorp Vault, etc.)

## Example .env Configuration

```env
# Generate these using: node scripts/generate-secrets.js
JWT_SECRET=a1b2c3d4e5f6...64-character-hex-string
SESSION_SECRET=f6e5d4c3b2a1...64-character-hex-string
JWT_EXPIRES_IN=24h
SESSION_MAX_AGE=86400000
```

## What happens if secrets are compromised?

- **JWT_SECRET compromised**: Attackers can create valid tokens, impersonate users
- **SESSION_SECRET compromised**: Attackers can forge session cookies, hijack sessions

**Response**: Immediately rotate both secrets and force all users to re-authenticate.

