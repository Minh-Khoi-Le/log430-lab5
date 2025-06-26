FROM node:18-alpine

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package.json files first to leverage Docker caching
COPY ./services/shared/package.json ./services/shared/
COPY ./services/stock-service/package.json ./services/stock-service/
COPY ./fix-shared-modules.js .

# Run the fix script to create proper export wrappers for shared modules
RUN node fix-shared-modules.js

# Install dependencies for shared module first
WORKDIR /app/services/shared
RUN npm install

# Install dependencies for the service
WORKDIR /app/services/stock-service
RUN npm install

# Copy the rest of the application code
COPY ./services/shared /app/services/shared
COPY ./services/stock-service /app/services/stock-service
COPY ./prisma /app/prisma

# Generate Prisma client
WORKDIR /app
RUN npm install -g prisma@5.14.0 && npx prisma generate

# Set the working directory to the service's folder
WORKDIR /app/services/stock-service

# Switch to the non-root user
USER nodejs

# Expose the port for the service
EXPOSE 3004

# Start the service
CMD ["node", "server.js"] 