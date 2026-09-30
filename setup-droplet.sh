#!/bin/bash
# ==============================================================================
# Cooperative Multi-Tenant Application - DigitalOcean Droplet Setup Script
# Run this script on your Ubuntu Droplet:
#   chmod +x setup-droplet.sh && sudo ./setup-droplet.sh
# ==============================================================================

set -e

echo "=========================================================="
echo "🔧 Setting up Cooperative Multi-Tenant Application Server"
echo "=========================================================="

# 1. Update system packages
echo "📦 Updating apt packages..."
apt-get update -y && apt-get upgrade -y

# 2. Setup 2GB Swap file if none exists (prevents Out-Of-Memory errors)
if [ ! -f /swapfile ]; then
    echo "💾 Creating 2GB swap file..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "✅ Swap file created and activated."
else
    echo "✅ Swap file already exists."
fi

# 3. Install Docker & Docker Compose if missing
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    apt-get install -y ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed successfully."
else
    echo "✅ Docker is already installed: $(docker --version)"
fi

# 4. Configure UFW Firewall
echo "🛡️ Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
# Enable firewall non-interactively
echo "y" | ufw enable || true
echo "✅ Firewall configured."

# 5. Display Docker status
echo "=========================================================="
echo "🎉 Server preparation complete!"
echo "Docker version: $(docker --version)"
echo "Docker Compose: $(docker compose version)"
echo ""
echo "Next steps:"
echo "1. Copy .env: cp .env.production.example .env"
echo "2. Edit variables: nano .env"
echo "3. Launch containers: docker compose up -d --build"
echo "=========================================================="
