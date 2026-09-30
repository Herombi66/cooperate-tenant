FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Ensure entrypoint is executable
RUN chmod +x ./docker-entrypoint.sh

# Expose backend port
EXPOSE 3001

# Run entrypoint
ENTRYPOINT ["./docker-entrypoint.sh"]
