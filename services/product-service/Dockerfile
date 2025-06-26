FROM node:16-alpine

# Install dependencies required for Prisma
RUN apk add --no-cache openssl

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package.json files first to leverage Docker caching
COPY ./services/shared/package.json ./services/shared/
COPY ./services/product-service/package.json ./services/product-service/
COPY ./fix-shared-modules.js .

# Run the fix script to create proper export wrappers for shared modules
RUN node fix-shared-modules.js

# Install dependencies for shared module first
WORKDIR /app/services/shared
RUN npm install

# Install dependencies for the service
WORKDIR /app/services/product-service
RUN npm install

# Copy the rest of the application code
COPY ./services/shared /app/services/shared
COPY ./services/product-service /app/services/product-service
COPY ./prisma /app/prisma

# Generate Prisma client
WORKDIR /app
ENV DATABASE_URL="postgresql://postgres:password@postgres:5432/log430_store" \
    PRISMA_BINARY_PLATFORM="linux-musl"
RUN npm install -g prisma@5.14.0 && \
    npx prisma generate && \
    mkdir -p /app/services/product-service/node_modules/.prisma && \
    cp -r /app/node_modules/.prisma/client /app/services/product-service/node_modules/.prisma/

# Set the working directory to the service's folder
WORKDIR /app/services/product-service

# Switch to the non-root user
USER nodejs

# Expose the port for the service
EXPOSE 3001

# Start the service
CMD ["node", "server.js"] 