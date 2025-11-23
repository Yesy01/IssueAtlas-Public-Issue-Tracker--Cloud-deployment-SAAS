FROM node:20-alpine

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the source
COPY . .

EXPOSE 8080

CMD ["npm", "run", "dev"]
