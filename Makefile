.PHONY: help build up down start stop restart logs clean rebuild crawl

# Detect Docker Compose command (V2 plugin or V1 standalone)
DOCKER_COMPOSE := $(shell docker compose version > /dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

# Default target
help:
	@echo "Search Engine - Docker Management"
	@echo "=================================="
	@echo "make build      - Build all Docker images"
	@echo "make up         - Start all services"
	@echo "make down       - Stop all services"
	@echo "make start      - Start all services (alias for up)"
	@echo "make stop       - Stop all services (alias for down)"
	@echo "make restart    - Restart all services"
	@echo "make logs       - View logs from all services"
	@echo "make logs-backend   - View backend logs"
	@echo "make logs-frontend  - View frontend logs"
	@echo "make logs-crawler   - View crawler logs"
	@echo "make clean      - Remove all containers and volumes"
	@echo "make rebuild    - Rebuild and restart all services"
	@echo "make crawl      - Run the crawler"
	@echo "make shell-backend  - Open shell in backend container"
	@echo "make shell-frontend - Open shell in frontend container"
	@echo "make db-backup  - Backup the database"

# Build all images
build:
	@echo "Building Docker images..."
	$(DOCKER_COMPOSE) build

# Start all services
up:
	@echo "Starting all services..."
	$(DOCKER_COMPOSE) up -d
	@echo "Services started!"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend:  http://localhost:4000"

# Stop all services
down:
	@echo "Stopping all services..."
	$(DOCKER_COMPOSE) down

# Aliases
start: up
stop: down

# Restart all services
restart:
	@echo "Restarting all services..."
	$(DOCKER_COMPOSE) restart

# View logs
logs:
	$(DOCKER_COMPOSE) logs -f

logs-backend:
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend:
	$(DOCKER_COMPOSE) logs -f frontend

logs-crawler:
	$(DOCKER_COMPOSE) logs -f crawler

# Clean up
clean:
	@echo "Cleaning up containers and volumes..."
	$(DOCKER_COMPOSE) down -v
	@echo "Cleanup complete!"

# Rebuild everything
rebuild:
	@echo "Rebuilding all services..."
	$(DOCKER_COMPOSE) down
	$(DOCKER_COMPOSE) build --no-cache
	$(DOCKER_COMPOSE) up -d
	@echo "Rebuild complete!"

# Run crawler
crawl:
	@echo "Running crawler..."
	$(DOCKER_COMPOSE) run --rm crawler

# Open shell in containers
shell-backend:
	docker exec -it search-engine-backend sh

shell-frontend:
	docker exec -it search-engine-frontend sh

# Backup database
db-backup:
	@echo "Backing up database..."
	@mkdir -p ./backups
	@docker cp search-engine-backend:/app/data/crawler_data.db ./backups/crawler_data_$(shell date +%Y%m%d_%H%M%S).db
	@echo "Database backed up to ./backups/"

# Install (first time setup)
install: build up
	@echo "Installation complete!"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend:  http://localhost:4000"
