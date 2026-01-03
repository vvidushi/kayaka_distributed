# Backend Scripts

## Utilities

**`generate-secrets.js`** - Generate JWT_SECRET and SESSION_SECRET
```bash
node scripts/generate-secrets.js
```

**`seed-test-users.js`** - Create test users for E2E tests
```bash
npm run seed:test-users
```

**`load-kaggle-data.js`** - Load real Kaggle datasets into MongoDB (flights, hotels, cars)
```bash
npm run load:kaggle-data
npm run load:kaggle-data -- --no-drop    # Append data without clearing
npm run load:kaggle-data -- --drop-all   # Drop all collections before loading
```

**`check-env.js`** - Verify environment variables
```bash
node scripts/check-env.js
```

## Image Scripts

**`download-images-simple.js`** - Download and upload images to Firebase
```bash
node scripts/download-images-simple.js
```
