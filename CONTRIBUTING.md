# Contributing to Search Engine

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Using Docker (Recommended)

1. **Prerequisites**
   ```bash
   ./check-system.sh
   ```

2. **Start Development Environment**
   ```bash
   make install
   # OR
   ./start.sh
   ```

3. **View Logs**
   ```bash
   make logs
   # OR
   docker compose logs -f
   ```

### Manual Setup

See the [Manual Setup](README.md#alternative-manual-setup-without-docker) section in README.md.

## Project Structure

```
SearchEngine/
├── frontend/          # React + Vite (Port 5173)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── TextSearchResults.jsx
│   │   ├── ImageSearchResult.jsx
│   │   └── ...
│   ├── Dockerfile
│   └── package.json
│
├── backend/           # Express.js API (Port 4000)
│   ├── server.js      # Main API server
│   ├── db.js          # Database connection
│   ├── Dockerfile
│   └── package.json
│
├── crawler/           # C++ Web Crawler
│   ├── crawler.cpp    # Main crawler logic
│   ├── CMakeLists.txt
│   └── Dockerfile
│
└── data/             # Shared SQLite database
    └── crawler_data.db
```

## Making Changes

### Frontend Development

1. **File Location**: `frontend/src/`
2. **Hot Reload**: Changes auto-reload in browser
3. **View Logs**: `make logs-frontend`

```bash
# Make changes to frontend files
# Browser will auto-reload

# If needed, restart frontend
docker compose restart frontend
```

### Backend Development

1. **File Location**: `backend/`
2. **Auto Restart**: Using nodemon
3. **View Logs**: `make logs-backend`

```bash
# Make changes to backend files
# Server will auto-restart

# If needed, restart backend
docker compose restart backend
```

### Crawler Development

1. **File Location**: `crawler/crawler.cpp`
2. **Rebuild Required**: C++ changes need compilation

```bash
# Edit crawler.cpp

# Rebuild and run
docker compose build crawler
make crawl
```

## Common Tasks

### Adding New Dependencies

**Frontend:**
```bash
# Enter container
make shell-frontend

# Install package
npm install package-name

# Exit and rebuild
exit
docker compose restart frontend
```

**Backend:**
```bash
# Enter container
make shell-backend

# Install package
npm install package-name

# Exit and rebuild
exit
docker compose restart backend
```

### Database Operations

**View Database:**
```bash
# Install SQLite browser or use CLI
sqlite3 data/crawler_data.db

# Example queries
.tables
SELECT COUNT(*) FROM pages;
SELECT * FROM pages LIMIT 5;
.quit
```

**Backup Database:**
```bash
make db-backup
```

**Reset Database:**
```bash
# Remove old database
rm data/crawler_data.db

# Run crawler again
make crawl
```

### Debugging

**Backend:**
```bash
# View detailed logs
make logs-backend

# Enter container for debugging
make shell-backend

# Check environment
env | grep DB_PATH
```

**Frontend:**
```bash
# View browser console
# Open DevTools in browser (F12)

# View container logs
make logs-frontend
```

## Testing

### Manual Testing

1. **Start Services**
   ```bash
   make start
   ```

2. **Run Crawler**
   ```bash
   make crawl
   ```

3. **Test Frontend**
   - Open http://localhost:5173
   - Try searches
   - Check knowledge graph
   - Test image search

4. **Test API**
   ```bash
   # Text search
   curl "http://localhost:4000/api/search?q=test"
   
   # Image search
   curl "http://localhost:4000/api/images?q=test"
   ```

## Code Style

### Frontend (JavaScript/React)
- Use functional components
- Use Tailwind CSS for styling
- Keep components small and focused
- Add comments for complex logic

### Backend (Node.js)
- Use async/await
- Handle errors properly
- Add logging for debugging
- Document API endpoints

### Crawler (C++)
- Follow existing code style
- Add comments for algorithms
- Handle memory properly
- Check for errors

## Pull Request Process

1. **Fork & Branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make Changes**
   - Write clear commit messages
   - Test your changes
   - Update documentation

3. **Test**
   ```bash
   make rebuild
   make crawl
   # Test manually
   ```

4. **Submit PR**
   - Clear description
   - Link related issues
   - Include screenshots if UI changes

## Useful Commands

```bash
# View all available commands
make help

# Quick system check
./check-system.sh

# Full rebuild
make rebuild

# Clean everything
make clean

# View specific service logs
make logs-backend
make logs-frontend
make logs-crawler

# Backup database
make db-backup
```

## Getting Help

- Check existing [Issues](https://github.com/amineichou/Search-Engine/issues)
- Read the [README](README.md)
- Check Docker logs: `make logs`

## Resources

- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [SQLite FTS5](https://www.sqlite.org/fts5.html)
- [Docker Documentation](https://docs.docker.com/)
- [Tailwind CSS](https://tailwindcss.com/)
