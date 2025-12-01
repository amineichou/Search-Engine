#!/bin/bash

echo "Search Engine - Quick Start Script"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! docker compose version &> /dev/null; then
    if ! command -v docker-compose &> /dev/null; then
        echo "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

echo "Docker and Docker Compose found"
echo ""

# Build images
echo "Building Docker images..."
$COMPOSE_CMD build

if [ $? -ne 0 ]; then
    echo "Failed to build Docker images"
    exit 1
fi

echo "Images built successfully"
echo ""

# Start services
echo "Starting services..."
$COMPOSE_CMD up -d

if [ $? -ne 0 ]; then
    echo "Failed to start services"
    exit 1
fi

echo "Services started successfully"
echo ""

# Wait a bit for services to start
echo "Waiting for services to be ready..."
sleep 5

echo ""
echo "======================================"
echo "Search Engine is ready!"
echo ""
echo "Crawler will run first to generate the database..."
echo "Backend will start automatically after crawler completes."
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:4000"
echo ""
echo "Next steps:"
echo "   1. View logs:   make logs"
echo "   2. Stop:        make stop"
echo ""
echo "Run 'make help' for more commands"
echo "======================================"
