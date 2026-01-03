# Kayak Helm Chart - Microservices Deployment

This Helm chart deploys the Kayak Travel Booking Platform with a microservices architecture on Kubernetes.

## Architecture

The application is split into the following microservices:

### Frontend
- **Service**: `frontend`
- **Port**: 80
- **Technology**: React + Vite
- **Description**: Web UI for the travel booking platform

### Backend Microservices
- **API Gateway** (`api-gateway:3000`) - Main entry point, request routing
- **Listings Service** (`listings-service:3001`) - Flights, hotels, cars from MongoDB
- **Bookings Service** (`bookings-service:3002`) - Booking management (Supabase)
- **Payments Service** (`payments-service:3003`) - Payment processing, invoices

### AI Agent
- **Service**: `ai-agent`
- **Port**: 8000
- **Technology**: Python FastAPI + LangChain
- **Description**: Conversational AI concierge with LangGraph routing

## Prerequisites

- Kubernetes cluster (EKS recommended)
- Helm 3.x
- kubectl configured
- AWS CLI (for ECR access)
- Secrets created (see below)

## Installation

### 1. Create Namespace

```bash
kubectl create namespace kayak-dev
```

### 2. Create Secrets

You MUST create secrets before deploying. Secrets contain sensitive information like API keys and database passwords.

```bash
# Backend secrets
kubectl create secret generic kayak-backend-secrets \
  --namespace=kayak-dev \
  --from-literal=DATABASE_URL='postgresql://postgres.xxx:Password@aws-1-us-east-1.pooler.supabase.com:5432/postgres' \
  --from-literal=MONGODB_URI='mongodb+srv://user:password@cluster.mongodb.net/kayak' \
  --from-literal=REDIS_URL='redis://default:password@redis-host:19566' \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  --from-literal=JWT_EXPIRES_IN='24h' \
  --from-literal=SESSION_SECRET='your-session-secret' \
  --from-literal=SESSION_MAX_AGE='86400000' \
  --from-literal=FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}' \
  --from-literal=FIREBASE_STORAGE_BUCKET='your-bucket.appspot.com'

# AI Agent secrets
kubectl create secret generic kayak-agent-secrets \
  --namespace=kayak-dev \
  --from-literal=OPENAI_API_KEY='sk-proj-...' \
  --from-literal=TAVILY_API_KEY='tvly-dev-...' \
  --from-literal=WEATHER_API_KEY='your-weather-api-key' \
  --from-literal=LANGSMITH_API_KEY='lsv2_pt_...' \
  --from-literal=LANGCHAIN_API_KEY='lsv2_pt_...' \
  --from-literal=SUPABASE_ACCESS_TOKEN='sbp_...' \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY='eyJhbGc...' \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=SUPABASE_DATABASE_URL='postgresql://...' \
  --from-literal=MONGODB_URI='mongodb+srv://...' \
  --from-literal=REDIS_URL='redis://...'
```

**Alternative**: Use the values from `backend/.env` and `ai-agent/.env` files:

```bash
# From backend/.env
kubectl create secret generic kayak-backend-secrets \
  --namespace=kayak-dev \
  --from-env-file=../../backend/.env

# From ai-agent/.env
kubectl create secret generic kayak-agent-secrets \
  --namespace=kayak-dev \
  --from-env-file=../../ai-agent/.env
```

### 3. Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 779926948199.dkr.ecr.us-east-1.amazonaws.com

# Build and push frontend
cd ../../../frontend
docker build -t 779926948199.dkr.ecr.us-east-1.amazonaws.com/kayak-dev-frontend:latest .
docker push 779926948199.dkr.ecr.us-east-1.amazonaws.com/kayak-dev-frontend:latest

# Build and push backend
cd ../backend
docker build -t 779926948199.dkr.ecr.us-east-1.amazonaws.com/kayak-dev-backend:latest .
docker push 779926948199.dkr.ecr.us-east-1.amazonaws.com/kayak-dev-backend:latest

# Build and push AI agent
cd ../ai-agent
docker build -t 779926948199.dkr.ecr.us-east-1.amazonaws.com/kayak-dev-agent:latest .
docker push 779926948199.dkr.ecr.us-east-1.amazonaws.com/kayak-dev-agent:latest
```

### 4. Install Helm Chart

```bash
# From this directory (infra/aws/helm/kayak)
helm install kayak . --namespace kayak-dev

# Or with custom values
helm install kayak . --namespace kayak-dev -f custom-values.yaml
```

### 5. Verify Deployment

```bash
# Check pods
kubectl get pods -n kayak-dev

# Check services
kubectl get svc -n kayak-dev

# Check ingress
kubectl get ingress -n kayak-dev

# View logs
kubectl logs -n kayak-dev -l app.kubernetes.io/component=api-gateway
kubectl logs -n kayak-dev -l app.kubernetes.io/component=ai-agent
```

## Configuration

### values.yaml Structure

```yaml
global:
  project: kayak
  environment: dev
  imageRegistry: 779926948199.dkr.ecr.us-east-1.amazonaws.com
  
frontend:
  enabled: true
  replicaCount: 2
  
apiGateway:
  enabled: true
  replicaCount: 2
  
listingsService:
  enabled: true
  replicaCount: 2
  
# ... other services
```

### Environment-Specific Values

Create separate values files for different environments:

```bash
# Development
helm install kayak . -f values.yaml -f values-dev.yaml

# Staging
helm install kayak . -f values.yaml -f values-staging.yaml

# Production
helm install kayak . -f values.yaml -f values-prod.yaml
```

## Upgrade

```bash
# Upgrade with new image tags
helm upgrade kayak . --namespace kayak-dev \
  --set frontend.image.tag=v1.2.0 \
  --set apiGateway.image.tag=v1.2.0 \
  --set aiAgent.image.tag=v1.2.0

# Rollback to previous version
helm rollback kayak 1 --namespace kayak-dev
```

## Uninstall

```bash
helm uninstall kayak --namespace kayak-dev
```

## Scaling

### Manual Scaling

```bash
# Scale listings service to 5 replicas
kubectl scale deployment listings-service --replicas=5 -n kayak-dev

# Or via Helm
helm upgrade kayak . --namespace kayak-dev --set listingsService.replicaCount=5
```

### Auto-scaling

Auto-scaling is enabled by default for most services. Configure in `values.yaml`:

```yaml
listingsService:
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 15
    targetCPUUtilizationPercentage: 70
```

## Monitoring

### View Metrics

```bash
# CPU/Memory usage
kubectl top pods -n kayak-dev

# Resource consumption
kubectl describe hpa -n kayak-dev
```

### Logs

```bash
# Follow logs for a service
kubectl logs -f -n kayak-dev -l app.kubernetes.io/component=listings

# All logs for a pod
kubectl logs -n kayak-dev <pod-name> --all-containers=true
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n kayak-dev

# Check events
kubectl get events -n kayak-dev --sort-by='.lastTimestamp'
```

### Image Pull Errors

```bash
# Verify ECR credentials
aws ecr get-login-password --region us-east-1

# Check if images exist
aws ecr list-images --repository-name kayak-dev-backend --region us-east-1
```

### ConfigMap/Secret Issues

```bash
# Verify secrets exist
kubectl get secrets -n kayak-dev

# Check secret content (base64 encoded)
kubectl get secret kayak-backend-secrets -n kayak-dev -o yaml

# Decode a secret value
kubectl get secret kayak-backend-secrets -n kayak-dev -o jsonpath='{.data.DATABASE_URL}' | base64 --decode
```

### Service Connection Issues

```bash
# Test service connectivity from within cluster
kubectl run -it --rm debug --image=busybox --restart=Never -n kayak-dev -- sh
# Inside the pod:
wget -O- http://api-gateway:3000/health
wget -O- http://listings-service:3001/health
```

## Microservices Communication

Services communicate internally via Kubernetes DNS:

- `frontend` → `api-gateway:3000` → Routes to appropriate microservice
- `api-gateway` → `listings-service:3001` (flights, hotels, cars)
- `api-gateway` → `bookings-service:3002` (bookings)
- `api-gateway` → `payments-service:3003` (payments)
- `frontend` → `ai-agent:8000` (chatbot)

## Backend Microservices Split

The backend needs to be refactored to support this microservices architecture. Each service should:

1. **API Gateway** (`backend/src/gateway/`)
   - Routes requests to appropriate microservice
   - Authentication middleware
   - Rate limiting

2. **Listings Service** (`backend/src/services/listings/`)
   - `GET /api/flights` - Search flights
   - `GET /api/hotels` - Search hotels
   - `GET /api/cars` - Search car rentals
   - MongoDB queries for travel listings

3. **Bookings Service** (`backend/src/services/bookings/`)
   - `POST /api/bookings` - Create booking
   - `GET /api/bookings/:id` - Get booking details
   - `PUT /api/bookings/:id` - Update booking
   - `DELETE /api/bookings/:id` - Cancel booking
   - Supabase queries for booking data

4. **Payments Service** (`backend/src/services/payments/`)
   - `POST /api/payments` - Process payment
   - `GET /api/payments/:id` - Payment status
   - `GET /api/invoices` - List invoices
   - Supabase queries for payment data

Each microservice should:
- Have its own Dockerfile
- Use environment variable `SERVICE_NAME` to determine which routes to register
- Share common code via npm workspace or shared package
- Connect to shared databases (Supabase, MongoDB, Redis)

## Security

- **Secrets**: Never commit secrets to git. Use Kubernetes secrets or AWS Secrets Manager.
- **RBAC**: Configure appropriate Kubernetes RBAC policies.
- **Network Policies**: Restrict inter-service communication.
- **Image Scanning**: Scan Docker images for vulnerabilities before deployment.

## License

Copyright © 2024 Kayak Project
