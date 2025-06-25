FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code (including prisma/)
COPY . .

# Generate Prisma client (required)
RUN npx prisma generate

EXPOSE 3000

# Add automatic migration on startup:
CMD npx prisma migrate deploy && npm start

# Automatically seed the database after migration:
CMD npx prisma migrate deploy && npm run seed && npm start
