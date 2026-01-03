# Firebase Setup Guide

## Overview

Firebase Storage is used for image uploads and management in both frontend and backend.

## Setup Steps

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project" or select existing project
3. Follow the setup wizard
4. Enable Google Analytics (optional)

### 2. Enable Firebase Storage

1. In Firebase Console, go to **Storage**
2. Click "Get started"
3. Choose "Start in test mode" (we'll update rules later)
4. Select a location for your storage bucket

### 3. Configure Storage Rules

Update Storage Rules in Firebase Console:

**For Development:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /kayak/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**For Production:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /kayak/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
                     request.resource.size < 5 * 1024 * 1024 &&
                     request.resource.contentType.matches('image/.*');
    }
  }
}
```

### 4. Get Frontend Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon (`</>`)
4. Register your app (if not already done)
5. Copy the Firebase configuration object

### 5. Get Backend Service Account

1. In Firebase Console, go to **Project Settings**
2. Click on **Service Accounts** tab
3. Click **Generate new private key**
4. Download the JSON file
5. Copy the entire JSON content to `FIREBASE_SERVICE_ACCOUNT` environment variable

**Note**: The `FIREBASE_SERVICE_ACCOUNT` should be a single-line JSON string. Replace newlines in the private key with `\n`.

## Environment Variables

### Backend (.env)

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

**Note**: The `FIREBASE_SERVICE_ACCOUNT` should be a single-line JSON string. Replace newlines in the private key with `\n`.

### Frontend (.env)

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Image Storage Structure

Images are stored with modular nesting and versioning:

```
kayak/
├── profiles/
│   └── {profile_id}/
│       ├── 1.jpg
│       └── 2.jpg (keeps 1 old version)
├── flights/
│   └── {flight_id}/
│       ├── 1.jpg
│       └── 2.jpg
├── hotels/
│   └── {hotel_id}/
│       ├── 1.jpg
│       └── 2.jpg
└── cars/
    └── {car_id}/
        ├── 1.jpg
        └── 2.jpg
```

## Usage

### Backend

```javascript
import { uploadProfileImage } from './services/image.service.js';

const result = await uploadProfileImage(file, profileId);
// Returns: { url, fileName, version, size, contentType, entityType, entityId }
```

### Frontend

```javascript
import { uploadProfileImage } from './services/image.service.js';

const result = await uploadProfileImage(file, profileId);
// Returns: { url, fileName, version, size, contentType, entityType, entityId }
```

## Features

- **Automatic Versioning**: Each upload increments version number
- **Old Version Cleanup**: Keeps only 1 old version (configurable)
- **File Validation**: Size limit (5MB) and type checking
- **Public URLs**: Images are automatically made public
- **Modular Paths**: Organized by entity type and ID

## Troubleshooting

1. **Storage not initialized**: Check `FIREBASE_SERVICE_ACCOUNT` is set correctly
2. **Upload fails**: Verify storage rules allow writes
3. **CORS errors**: Configure CORS in Firebase Console if needed
4. **Permission denied**: Check storage rules match your use case

## Free Tier Limits

Firebase Storage free tier includes:
- 5 GB storage
- 1 GB/day downloads
- 20,000 uploads/day

