#!/bin/bash

echo "Search Engine - System Check"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo -n "Checking Docker... "
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | tr -d ',')
    echo -e "${GREEN}✓${NC} (${DOCKER_VERSION})"
else
    echo -e "${RED}✗${NC} Not installed"
    ERRORS=1
fi

# Check Docker Compose
echo -n "Checking Docker Compose... "
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version --short)
    echo -e "${GREEN}✓${NC} (${COMPOSE_VERSION})"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d ' ' -f4 | tr -d ',')
    echo -e "${YELLOW}!${NC} (${COMPOSE_VERSION}) - Consider upgrading to Docker Compose V2"
else
    echo -e "${RED}✗${NC} Not installed"
    ERRORS=1
fi

# Check Make
echo -n "Checking Make... "
if command -v make &> /dev/null; then
    MAKE_VERSION=$(make --version | head -n 1 | cut -d ' ' -f3)
    echo -e "${GREEN}✓${NC} (${MAKE_VERSION})"
else
    echo -e "${YELLOW}!${NC} Not installed (optional)"
fi

echo ""
echo "Checking project structure..."

# Check directories
for dir in frontend backend crawler data; do
    echo -n "  ${dir}/... "
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        ERRORS=1
    fi
done

# Check important files
echo ""
echo "Checking configuration files..."

for file in docker-compose.yml Makefile frontend/Dockerfile backend/Dockerfile crawler/Dockerfile; do
    echo -n "  ${file}... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        ERRORS=1
    fi
done

echo ""
echo "================================"

if [ ! -z "$ERRORS" ]; then
    echo -e "${RED}Some checks failed. Please fix the issues above.${NC}"
    exit 1
else
    echo -e "${GREEN}All checks passed! You're ready to go.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run './start.sh' or 'make install' to start the search engine"
    echo "  2. Run 'make crawl' to populate the database"
    echo "  3. Access the frontend at http://localhost:5173"
fi
