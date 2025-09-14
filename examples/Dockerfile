# Multi-stage Docker build for Cronx
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/ ./packages/

# Install dependencies and build
RUN npm ci
RUN npm run build

# Production stage
FROM node:18-alpine AS runtime

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/node_modules ./node_modules

# Copy examples
COPY examples/ ./examples/

# Create non-root user
RUN addgroup -g 1001 -S cronx && \
    adduser -S cronx -u 1001

# Set permissions
RUN chown -R cronx:cronx /app
USER cronx

# Initialize dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Default command (can be overridden)
CMD ["node", "examples/basic.ts"]