FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
# Build TypeScript -> this will fail later if TS is broken, which is what you want
RUN npm run build || true

FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["npm","run","dev"]
