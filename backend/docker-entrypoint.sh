#!/bin/sh
set -e

echo "=========================================================="
echo "🚀 Starting Cooperative Multi-Tenant Application Backend"
echo "=========================================================="

# Ensure uploads directory exists
mkdir -p /app/uploads /app/uploads/bylaws

# Wait for Database and Run Migrations
echo "⏳ Verifying database connection and applying migrations..."
node ./wait-for-db.js

# Start Node server
echo "✅ Database initialized. Starting server on port ${PORT:-3001}..."
exec node ./bin/www
