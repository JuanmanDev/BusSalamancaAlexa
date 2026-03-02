FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files to install potential shared dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the shared siri folder
COPY siri ./siri

# Set up web directory
WORKDIR /app/web

# Copy web package files and install dependencies
COPY web/package.json web/package-lock.json ./
RUN npm install

# Copy the rest of the web application code
COPY web .

# Build the Nuxt application
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy the build output from the builder stage
COPY --from=builder /app/web/.output ./

# Host and Port environment variables
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "server/index.mjs"]
