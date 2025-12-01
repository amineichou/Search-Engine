# Search Engine

A full-stack search engine with web crawler, backend API, and React frontend.

## Features

- Full-text search with FTS5
- Web crawler (C++)
- Knowledge graph extraction
- Clean, Google-style UI
- Spell correction
- Image search
- Personalization based on search history
- Fully Dockerized

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Make (optional, for convenience)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd SearchEngine
```

2. Start all services
```bash
make install
# OR
docker compose up -d
```

**Note:** The crawler will run first and complete before the backend starts. This ensures the database is ready for the backend to use. Both services share a common volume (`./data`) where the database is stored.

3. Access the application
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

### Using Makefile

```bash
# Start all services
make start

# Stop all services
make stop

# View logs
make logs

# Run crawler
make crawl

# Rebuild everything
make rebuild

# Clean up
make clean

# See all commands
make help
```

### Manual Docker Commands

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Run crawler
docker compose run --rm crawler
```

## Project Structure

```
SearchEngine/
├── frontend/          # React + Vite frontend
├── backend/           # Express.js API
├── crawler/           # C++ web crawler
├── data/             # Shared database volume
├── docker-compose.yml
├── Makefile
└── README.md
```

## Development

### Backend

The backend automatically reloads on file changes using nodemon.

```bash
# View backend logs
make logs-backend

# Access backend shell
make shell-backend
```

### Frontend

The frontend uses Vite's hot reload.

```bash
# View frontend logs
make logs-frontend

# Access frontend shell
make shell-frontend
```

### Crawler

The crawler runs automatically on first startup and generates the database. To re-run the crawler:

```bash
make crawl
```

Edit `crawler/crawler.cpp` to modify the list of websites to crawl.

## Database

The SQLite database (`crawler_data.db`) is stored in the shared `./data/` volume and is accessible to both the crawler and backend services. The database persists across container restarts.

### How it Works

1. **Crawler** writes to `/app/data/crawler_data.db` inside its container
2. **Backend** reads from `/app/data/crawler_data.db` inside its container
3. Both paths map to `./data/crawler_data.db` on your host machine via Docker volumes
4. The backend waits for the crawler to complete before starting (configured via `depends_on` in docker-compose.yml)

### Backup Database

```bash
make db-backup
```

Backups are saved to `./backups/` directory.

## Troubleshooting

### Port already in use

If ports 4000 or 5173 are already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "4001:4000"  # Change 4000 to 4001
```

### Reset everything

```bash
make clean
make rebuild
```

### Database issues

```bash
# Backup current database
make db-backup

# Clean and rebuild
make clean
make install
make crawl
```

---

## Alternative: Manual Setup (Without Docker)

### Prerequisites
- C++ compiler (e.g., g++)
- CMake
- Node.js and npm

### Step 1: Build and Run the Crawler
1. Navigate to the `crawler` directory:
   ```bash
   cd crawler
   ```
2. Create a build directory and navigate into it:
   ```bash
   mkdir build && cd build
   ```
3. Run CMake to configure the project:
   ```bash
   cmake ..
   ```
4. Build the crawler:
   ```bash
   make
   ```
5. Run the crawler to start crawling websites:
   ```bash
   ./crawler
   ```

### Step 2: Set Up the Backend Server
1. Navigate to the `backend` directory:
   ```bash
   cd ../../backend
   ```
2. Install the required Node.js packages:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   npm run dev
   ```
### Step 3: Set Up the Frontend
1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install the required Node.js packages:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
4. Open your web browser and go to `http://localhost:5173` to access the search engine interface.

## Notes
- Ensure that the crawler has completed its task and the indexed data is available before performing searches through the frontend interface.
- You can modify the list of starting websites in `crawler/crawler.cpp` to customize the crawling process.