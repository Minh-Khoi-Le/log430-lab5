FROM node:20-alpine

# Install dependencies required for Prisma and create a non-root user
RUN apk add --no-cache openssl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy npmrc to handle workspace protocol properly
COPY .npmrc .

# Copy all package.json files to leverage Docker caching
COPY package.json .
COPY services/cart-service/package.json services/cart-service/
COPY services/product-service/package.json services/product-service/
COPY services/refund-service/package.json services/refund-service/
COPY services/sales-service/package.json services/sales-service/
COPY services/stock-service/package.json services/stock-service/
COPY services/store-service/package.json services/store-service/
COPY services/user-service/package.json services/user-service/
COPY services/shared/package.json services/shared/

# Fix workspace: references in package.json files and install dependencies
RUN find . -name "package.json" -exec sed -i 's/"workspace:\*"/"1.0.0"/g' {} \; && \
    npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma client
WORKDIR /app
ENV PRISMA_BINARY_PLATFORM="linux-musl"
RUN npx prisma generate

# Set the working directory to the service's folder
WORKDIR /app/services/refund-service

# Switch to the non-root user
USER nodejs

# Expose the port for the service
EXPOSE 3006

# Start the service
CMD ["node", "server.js"]