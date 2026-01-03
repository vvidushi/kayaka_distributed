FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files
COPY package*.json ./

# Copy source code
COPY src ./src
COPY prisma ./prisma
COPY kafka ./kafka
COPY healthcheck.js ./

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --no-audit

# Copy application code from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/kafka ./kafka
COPY --from=builder /app/healthcheck.js ./healthcheck.js

# Note: .env file is NOT copied - it's provided via env_file in docker-compose.yml
# The server will use environment variables from the container environment

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Health check (using external script for better error handling)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD node healthcheck.js

# Start application
CMD ["node", "src/server.js"]
