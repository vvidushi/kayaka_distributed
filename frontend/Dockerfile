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

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (Vite + plugins are dev deps but required for preview)
# Add retry logic for network issues
RUN npm ci --prefer-offline --no-audit || \
    (sleep 5 && npm ci --prefer-offline --no-audit) || \
    (sleep 10 && npm ci --prefer-offline --no-audit) && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist
# Copy vite.config.js for preview server configuration
COPY --from=builder /app/vite.config.js ./vite.config.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5173', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start preview server (serves built files)
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
