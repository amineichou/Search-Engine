# Backend Dockerfile
FROM node:20-alpine

# Install build dependencies for better-sqlite3 and wget for healthcheck
RUN apk add --no-cache wget python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create data directory for SQLite database
RUN mkdir -p /app/data

EXPOSE 4000

CMD ["node", "server.js"]
