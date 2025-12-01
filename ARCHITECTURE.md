# Search Engine Architecture

## Database Sharing Strategy

This project uses a **shared volume** approach to ensure both the crawler and backend can access the same SQLite database file.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Host                            │
│                                                             │
│  ┌──────────────┐                                           │
│  │              │                                           │
│  │  ./data/     │  (Shared Volume on Host)                  │
│  │              │                                           │
│  │  ├─ crawler_data.db                                      │
│  │                                                          │
│  └──────────────┘                                           │
│        ▲  ▲                                                 │
│        │  │                                                 │
│        │  └─────────────────────┐                           │
│        │                        │                           │
│  ┌─────┴─────────┐      ┌───────┴────────┐                  │
│  │   Crawler     │      │    Backend     │                  │
│  │   Container   │      │    Container   │                  │
│  │               │      │                │                  │
│  │ /app/data/    │      │ /app/data/     │                  │
│  │ crawler_data  │      │ crawler_data   │                  │
│  │     .db       │      │     .db        │                  │
│  └───────────────┘      └────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Crawler Service** (`crawler` container):
   - Runs **first** and **completes** before other services start
   - Writes database to `/app/data/crawler_data.db` inside container
   - This maps to `./data/crawler_data.db` on host via volume mount
   - Uses `restart: "no"` to run once and exit
   - Environment variable: `DB_PATH=/app/data/crawler_data.db`

2. **Backend Service** (`backend` container):
   - Waits for crawler to complete successfully
   - Reads database from `/app/data/crawler_data.db` inside container
   - This maps to the **same** `./data/crawler_data.db` on host
   - Environment variable: `DB_PATH=/app/data/crawler_data.db`
   - Uses `depends_on` with `condition: service_completed_successfully`

3. **Frontend Service** (`frontend` container):
   - Starts after backend is ready
   - Communicates with backend via HTTP API
   - No direct database access needed

### Service Startup Order

```
1. Crawler (runs and completes)
   ↓
2. Backend (waits for crawler, then starts)
   ↓
3. Frontend (waits for backend, then starts)
```

### Volume Configuration

In `docker-compose.yml`:

```yaml
volumes:
  - ./data:/app/data  # Maps host ./data to container /app/data
```

This creates a **bidirectional** mount where:
- Files written inside `/app/data` in the container appear in `./data` on host
- Files in `./data` on host are accessible at `/app/data` in the container

### Benefits

**No timing issues** - Backend only starts after crawler completes  
**Shared access** - Both services access the same file  
**Persistence** - Data survives container restarts  
**Easy backup** - Database file is accessible on host at `./data/crawler_data.db`  
**Development friendly** - Can inspect/backup database directly from host  

### Re-running the Crawler

If you need to re-crawl and regenerate the database:

```bash
# Stop all services
make stop

# Remove the crawler container
docker rm search-engine-crawler

# Start services again (crawler will run first)
make start

# OR manually run crawler only
make crawl
```

### Environment Variables

Both services use the same `DB_PATH` environment variable pointing to the shared location:

- Crawler: `DB_PATH=/app/data/crawler_data.db`
- Backend: `DB_PATH=/app/data/crawler_data.db`

This ensures they're always looking at the same file path inside their respective containers.
