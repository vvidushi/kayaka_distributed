FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
# Add retry logic for network issues
RUN npm ci --prefer-offline --no-audit || \
    (sleep 5 && npm ci --prefer-offline --no-audit) || \
    (sleep 10 && npm ci --prefer-offline --no-audit) && \
    npm cache clean --force

# Copy source code (assets are stored in Firebase, not included here)
COPY . .

# Build the application
RUN npm run build

FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Copy built application from builder
COPY --from=builder /app/dist .

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
