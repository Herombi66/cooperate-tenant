# Stage 1: Build React Vite Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies (including devDependencies needed for vite build)
RUN npm ci

# Copy source files
COPY . .

# Build arguments (default to /api for reverse proxy)
ARG VITE_API_URL="/api"
ENV VITE_API_URL=$VITE_API_URL

# Build application
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine

# Remove default static files
RUN rm -rf /usr/share/nginx/html/*

# Copy build outputs from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx server configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
