#!/bin/bash
set -e

echo "============================================"
echo "  Nos limites - Development Setup"
echo "============================================"
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd server
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "  Backend dependencies already installed."
fi
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd client
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "  Frontend dependencies already installed."
fi
cd ..

# Create .env file if it doesn't exist
if [ ! -f "server/.env" ]; then
    echo "Creating default .env file for server..."
    cp server/.env.example server/.env 2>/dev/null || cat > server/.env << 'ENVEOF'
# Server Configuration
PORT=3001
NODE_ENV=development

# Database - SQLite (local file for development)
DATABASE_URL=file:./data/noslimites.db

# JWT Secret (change in production!)
JWT_SECRET=dev-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production

# Session duration
SESSION_DURATION=30d

# Magic Link
MAGIC_LINK_EXPIRY=15m
MAGIC_LINK_BASE_URL=http://localhost:5173

# Email (development - logs to console)
EMAIL_PROVIDER=console

# OAuth (optional - leave empty to disable)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
ENVEOF
    echo "  Created server/.env with development defaults."
fi

# Run database migrations
echo ""
echo "Running database migrations..."
cd server
npm run db:migrate 2>/dev/null || echo "  Migrations will run on first server start."
cd ..

# Seed limit categories data
echo "Seeding limit categories..."
cd server
npm run db:seed 2>/dev/null || echo "  Seed data will be loaded on first server start."
cd ..

echo ""
echo "============================================"
echo "  Starting Development Servers"
echo "============================================"
echo ""

# Start backend server
echo "Starting backend server on port 3001..."
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 5

# Start frontend dev server
echo "Starting frontend dev server on port 5173..."
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================"
echo "  Nos limites is running!"
echo "============================================"
echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3001"
echo "  Health:   http://localhost:3001/api/health"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "============================================"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
