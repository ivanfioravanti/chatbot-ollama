#!/bin/bash

set -e  # Exit on error

PROJECT_DIR="/home/ubuntu/chatbot-ollama"
SERVICE_NAME="chatbot.service"

echo "🔍 Checking if Node.js and npm are installed..."
if ! command -v npm &> /dev/null || ! command -v node &> /dev/null; then
  echo "🚧 npm or Node.js not found. Installing Node.js (includes npm)..."
  # Install Node.js (using NodeSource for latest LTS)
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "✅ Node.js and npm are already installed."
fi

echo "📦 Installing project dependencies..."
cd "$PROJECT_DIR"
npm ci

echo "🛠️  Setting up systemd service..."
# Copy the .service file
sudo cp "$PROJECT_DIR/$SERVICE_NAME" /etc/systemd/system/$SERVICE_NAME

# Reload systemd and enable the chatbot service
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

# Check if the service is running
echo "🔍 Checking $SERVICE_NAME status..."
if systemctl is-active --quiet $SERVICE_NAME; then
  echo "✅ $SERVICE_NAME is running."
else
  echo "❌ $SERVICE_NAME failed to start."
  sudo systemctl status $SERVICE_NAME --no-pager
  exit 1
fi
