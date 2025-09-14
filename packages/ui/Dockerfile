# Dockerfile for Cronx UI
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/ ./packages/

# Install dependencies and build core
RUN npm ci
RUN npm run build --workspace=packages/core

# Build UI
RUN npm run build --workspace=packages/ui

# Production stage
FROM node:18-alpine AS runtime

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/ui/.next ./packages/ui/.next
COPY --from=builder /app/packages/ui/package.json ./packages/ui/
COPY --from=builder /app/packages/ui/next.config.js ./packages/ui/
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S cronx && \
    adduser -S cronx -u 1001

# Set permissions
RUN chown -R cronx:cronx /app
USER cronx

# Expose port
EXPOSE 5000

# Initialize dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start UI
CMD ["npm", "run", "start", "--workspace=packages/ui"]