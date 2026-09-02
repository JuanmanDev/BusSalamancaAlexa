FROM node:22-alpine AS builder

WORKDIR /app

# Build dependencies for sqlite3 (native module)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Build deps are needed only if sqlite3 has no prebuilt binary for this platform
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Built files + OpenAPI schema served at /openapi.yaml
COPY --from=builder /app/dist ./dist
COPY openapi.yaml ./openapi.yaml

# Volume directory for sqlite
RUN mkdir -p /data
ENV DATABASE_PATH=/data/storage.db
ENV VERIFY_SIGNATURE=true

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "dist/server.js"]
