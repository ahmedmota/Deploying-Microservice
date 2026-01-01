#!/bin/bash

# EC2 Instance Setup Script
# This script installs all necessary dependencies for running Node.js microservices

set -e

echo "========================================="
echo "EC2 Instance Setup - E-Commerce Platform"
echo "========================================="

# Update system packages
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install PM2 globally
echo "Installing PM2 process manager..."
sudo npm install -g pm2

# Install other useful packages
sudo npm install -g serve  # For serving static files (frontend)

# Install Git
echo "Installing Git..."
sudo apt install -y git

# Install build essentials (required for native modules)
echo "Installing build essentials..."
sudo apt install -y build-essential

# Install PostgreSQL client (for database operations)
echo "Installing PostgreSQL client..."
sudo apt install -y postgresql-client

# Install Redis CLI (for Redis operations)
echo "Installing Redis CLI..."
sudo apt install -y redis-tools

# Install CloudWatch agent
echo "Installing CloudWatch agent..."
wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# Create application directory
echo "Creating application directory..."
sudo mkdir -p /opt/ecommerce
sudo chown ubuntu:ubuntu /opt/ecommerce

# Create logs directory
sudo mkdir -p /var/log/ecommerce
sudo chown ubuntu:ubuntu /var/log/ecommerce

# Configure PM2 startup
echo "Configuring PM2 startup..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Install unzip (useful for deployments)
sudo apt install -y unzip

# Configure system limits for Node.js
echo "Configuring system limits..."
sudo tee -a /etc/security/limits.conf > /dev/null <<EOF
ubuntu soft nofile 65536
ubuntu hard nofile 65536
ubuntu soft nproc 65536
ubuntu hard nproc 65536
EOF

# Configure sysctl
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
net.ipv4.ip_local_port_range = 1024 65535
net.core.somaxconn = 65535
EOF
sudo sysctl -p

# Create health check script
cat > /home/ubuntu/health-check.sh << 'HEALTHCHECK'
#!/bin/bash
# Health check script for PM2 processes

SERVICE_NAME=$1
PORT=$2

if pm2 list | grep -q "$SERVICE_NAME.*online"; then
    if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
        echo "OK: $SERVICE_NAME is healthy"
        exit 0
    else
        echo "ERROR: $SERVICE_NAME health endpoint failed"
        exit 1
    fi
else
    echo "ERROR: $SERVICE_NAME is not running"
    exit 1
fi
HEALTHCHECK

chmod +x /home/ubuntu/health-check.sh

# Create deployment helper script
cat > /home/ubuntu/deploy.sh << 'DEPLOYSCRIPT'
#!/bin/bash
# Deployment helper script

SERVICE_NAME=$1
SERVICE_PATH=$2
PORT=$3

if [ -z "$SERVICE_NAME" ] || [ -z "$SERVICE_PATH" ] || [ -z "$PORT" ]; then
    echo "Usage: $0 <service-name> <service-path> <port>"
    exit 1
fi

echo "Deploying $SERVICE_NAME..."

# Navigate to service directory
cd "$SERVICE_PATH" || exit 1

# Pull latest code (if using git)
if [ -d .git ]; then
    echo "Pulling latest code..."
    git pull
fi

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Run migrations if script exists
if grep -q "\"migrate\"" package.json; then
    echo "Running database migrations..."
    npm run migrate || echo "No migrations to run"
fi

# Restart service with PM2
echo "Restarting $SERVICE_NAME with PM2..."
pm2 restart "$SERVICE_NAME" || pm2 start src/server.js --name "$SERVICE_NAME"
pm2 save

echo "$SERVICE_NAME deployed successfully!"
DEPLOYSCRIPT

chmod +x /home/ubuntu/deploy.sh

echo "========================================="
echo "Setup completed successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Deploy your application code to /opt/ecommerce"
echo "2. Configure environment variables"
echo "3. Start services with PM2"
echo ""
echo "Useful commands:"
echo "  pm2 list              - List all running processes"
echo "  pm2 logs <name>       - View logs for a service"
echo "  pm2 restart <name>    - Restart a service"
echo "  ./deploy.sh <name> <path> <port> - Deploy/update a service"
echo ""
