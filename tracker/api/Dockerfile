# ---------- Build stage ----------
FROM node:20 AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript -> dist/
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install OpenSSL so Prisma can detect libssl
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy only what we need to run
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080

# Run compiled JS directly
CMD ["node", "dist/index.js"]
