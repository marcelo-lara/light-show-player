# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-slim
WORKDIR /app

# Install runtime dependencies if any
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# The DMX scheduler requires high precision; 
# running as root is sometimes necessary for SCHED_FIFO in specialized environments
USER node

EXPOSE 3000
EXPOSE 6454/udp

CMD ["node", "dist/index.js"]