# Store Service Dockerfile
# 
# This Dockerfile creates a production-ready container for the Store Service
# microservice. It follows Node.js best practices for containerization including
# multi-stage builds, non-root user execution, and minimal attack surface.
#
# Build stages:
# 1. Dependencies: Install and cache dependencies
# 2. Production: Create final production image
#
# Features:
# - Multi-stage build for smaller final image
# - Non-root user for security
# - Health check endpoint
# - Proper signal handling
# - Optimized layer caching

# Build stage: Install dependencies
FROM node:18-alpine AS dependencies

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies only
# Use npm ci for faster, reliable, reproducible builds
RUN npm ci --only=production && npm cache clean --force

# Production stage: Create final image
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodegroup && \
    adduser -S nodeuser -u 1001 -G nodegroup

# Set working directory
WORKDIR /app

# Copy dependencies from build stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source code
COPY --chown=nodeuser:nodegroup . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs && \
    chown -R nodeuser:nodegroup /app

# Switch to non-root user
USER nodeuser

# Expose the service port
EXPOSE 3002

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js || exit 1

# Set production environment
ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]

# Metadata labels
LABEL maintainer="Store Service Team" \
      version="1.0.0" \
      description="Store Service - Microservice for store management operations" \
      service="store-service"
