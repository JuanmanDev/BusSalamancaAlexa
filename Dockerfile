FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for sqlite3 (if needed for native recompile)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install runtime dependencies for sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# Install only production dependencies
RUN npm install --only=production

# Copy built files
COPY --from=builder /app/dist ./dist

# Create a volume directory for sqlite
RUN mkdir -p /data
ENV DATABASE_PATH=/data/storage.db

EXPOSE 3000

CMD ["node", "dist/server.js"]
