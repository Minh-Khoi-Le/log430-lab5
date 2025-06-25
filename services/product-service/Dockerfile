# Product Service Dockerfile
#
# This Dockerfile creates a containerized version of the Product Service microservice.
# It uses a multi-stage build approach for optimization and security.
#
# Build Process:
# 1. Base stage: Sets up Node.js environment and installs dependencies
# 2. Production stage: Creates minimal runtime image with only necessary files
#
# The resulting container:
# - Runs as non-root user for security
# - Exposes port 3001 for the product service
# - Includes health check endpoint
# - Optimized for production deployment

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S productservice -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy installed dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source code
COPY --chown=productservice:nodejs . .

# Create directories with proper permissions
RUN mkdir -p /app/logs && \
    chown -R productservice:nodejs /app

# Switch to non-root user
USER productservice

# Expose port 3001 (product service default port)
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3001, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      console.log('Health check status:', res.statusCode); \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
    req.end();"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV SERVICE_NAME=product-service

# Define the command to run the application
CMD ["node", "server.js"]

# Labels for container metadata
LABEL maintainer="LOG430 Team"
LABEL service="product-service"
LABEL version="1.0.0"
LABEL description="Product management microservice for LOG430 project"
