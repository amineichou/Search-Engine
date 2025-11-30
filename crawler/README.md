# Web Crawler in C++

A powerful web crawler written in C++ that extracts web page content and stores it in a SQLite database.

## Features

- **Web Crawling**: Crawls websites starting from a seed URL
- **Content Extraction**: Extracts titles, descriptions, and main content
- **Image URLs**: Collects all image URLs from web pages
- **Tags/Keywords**: Extracts meta keywords and tags
- **SQLite Storage**: Stores all data in a structured SQLite database
- **Link Following**: Automatically discovers and follows links within the same domain

## Database Schema

The crawler creates three tables in `crawler_data.db`:

### Pages Table
- `id`: Primary key
- `url`: Unique URL of the page
- `title`: Page title
- `description`: Meta description
- `content`: Main page content (limited to 5000 chars)
- `crawled_at`: Timestamp when crawled

### Images Table
- `id`: Primary key
- `page_id`: Foreign key to pages table
- `image_url`: URL of the image

### Tags Table
- `id`: Primary key
- `page_id`: Foreign key to pages table
- `tag`: Tag/keyword from meta tags

## Dependencies

You need to install the following libraries:

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y libcurl4-openssl-dev libsqlite3-dev libgumbo-dev build-essential cmake
```

### Fedora/RHEL
```bash
sudo dnf install -y libcurl-devel sqlite-devel gumbo-parser-devel gcc-c++ cmake
```

### macOS
```bash
brew install curl sqlite gumbo-parser cmake
```

### Arch Linux
```bash
sudo pacman -S curl sqlite gumbo-parser cmake gcc
```

## Building

```bash
# Create build directory
mkdir build
cd build

# Configure with CMake
cmake ..

# Build
make

# Run the crawler
./crawler
```

## Usage

The crawler is configured to crawl Wikipedia starting from the main page. You can modify the following constants in `crawler.cpp`:

- `START_WEBSITE`: The initial URL to start crawling from
- `MAX_PAGES`: Maximum number of pages to crawl (default: 50)

### Customizing the Crawler

To crawl a different website, edit `crawler.cpp`:

```cpp
#define START_WEBSITE "https://example.com"
#define MAX_PAGES 100
```

Then rebuild:
```bash
cd build
make
./crawler
```

## Output

The crawler will:
1. Display progress in the terminal showing each URL being crawled
2. Create a `crawler_data.db` file in the current directory
3. Store all extracted data in the database

Example output:
```
Starting web crawler...
Target: https://en.wikipedia.org/wiki/Main_Page
Max pages: 50
-----------------------------------
Crawling [1/50]: https://en.wikipedia.org/wiki/Main_Page
  ✓ Saved: Wikipedia, the free encyclopedia
  - Images: 23
  - Tags: 5
Crawling [2/50]: https://en.wikipedia.org/wiki/Portal:Arts
  ✓ Saved: Portal:Arts - Wikipedia
  - Images: 15
  - Tags: 3
...
```

## Querying the Database

You can query the database using SQLite:

```bash
# Open the database
sqlite3 crawler_data.db

# Example queries:
# Get all crawled pages
SELECT url, title FROM pages;

# Get all images from a specific page
SELECT i.image_url FROM images i
JOIN pages p ON i.page_id = p.id
WHERE p.url = 'https://example.com';

# Get all tags
SELECT p.url, t.tag FROM tags t
JOIN pages p ON t.page_id = p.id;

# Count total images
SELECT COUNT(*) FROM images;
```

## Configuration

The crawler includes these settings:
- **User-Agent**: Set to "Mozilla/5.0 (compatible; WebCrawler/1.0)"
- **Timeout**: 10 seconds per request
- **Follow Redirects**: Enabled
- **Same-Domain Only**: Only crawls links within the same domain

## Notes

- The crawler respects the `MAX_PAGES` limit to avoid excessive crawling
- Only links from the same domain are followed (configurable in the code)
- Duplicate URLs are automatically skipped
- Failed downloads are logged but don't stop the crawler
- Content is truncated to 5000 characters per page to save space
