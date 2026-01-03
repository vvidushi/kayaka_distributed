#!/bin/bash

# ============================================
# Deploy Configuration to Kubernetes
# ============================================

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Load environment variables from backend/.env
if [ -f backend/.env ]; then
  echo "Reading backend/.env..."
  export $(grep -v '^#' backend/.env | xargs)
else
  echo "ERROR: backend/.env not found!"
  exit 1
fi

# Check for localhost in critical variables
if [[ "$KAFKA_BROKERS" == *"localhost"* ]]; then
  echo "WARNING: KAFKA_BROKERS is set to localhost ($KAFKA_BROKERS)."
  echo "   This will likely fail in Kubernetes."
  echo "   Please update backend/.env with the production Kafka broker list."
fi

if [[ "$REDIS_HOST" == *"localhost"* ]]; then
  echo "WARNING: REDIS_HOST is set to localhost ($REDIS_HOST)."
  echo "   This will likely fail in Kubernetes."
fi

# Create Namespace if not exists
kubectl create namespace kayak --dry-run=client -o yaml | kubectl apply -f -

# Delete existing secret if exists
kubectl delete secret backend-secrets -n kayak --ignore-not-found

# Create Secret
echo "mj Creating 'backend-secrets' in namespace 'kayak'..."
kubectl create secret generic backend-secrets \
  -n kayak \
  --from-literal=NODE_ENV=production \
  --from-literal=PORT=3000 \
  --from-literal=API_VERSION="$API_VERSION" \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=MONGODB_URI="$MONGODB_URI" \
  --from-literal=REDIS_URL="$REDIS_URL" \
  --from-literal=REDIS_HOST="$REDIS_HOST" \
  --from-literal=REDIS_PORT="$REDIS_PORT" \
  --from-literal=KAFKA_BROKERS="$KAFKA_BROKERS" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_EXPIRES_IN="$JWT_EXPIRES_IN" \
  --from-literal=SESSION_SECRET="$SESSION_SECRET" \
  --from-literal=SESSION_MAX_AGE="$SESSION_MAX_AGE" \
  --from-literal=CORS_ORIGIN="*" \
  --from-literal=LOG_LEVEL="$LOG_LEVEL" \
  --from-literal=FIREBASE_SERVICE_ACCOUNT="$FIREBASE_SERVICE_ACCOUNT" \
  --from-literal=FIREBASE_STORAGE_BUCKET="$FIREBASE_STORAGE_BUCKET"

echo "Secrets deployed successfully!"
