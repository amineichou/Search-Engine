# Backend

## Overview
This is the backend service for the Search Engine application.

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the root directory (backend/.env):

```env
PORT=3000
```

## Running the Application

```bash
# Development mode
npm run dev
```

## API Endpoints

### Search
- `GET /api/search?q=query` - Search for documents

### Health Check
- `GET /api/health` - Check service status