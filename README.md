# Search Engine 101
## How It Works, Technology Behind It, Optimizations & How to Build Your Own

Search engines look simple from outside, you type a query, they give you results instantly.
But inside, they are giant pipelines combining crawling, indexing, ranking, storage, distributed systems, and AI-based relevance models.

### In this guide, we break down:

1. How search engines work
2. What technologies they use
3. What optimizations real engines apply
4. How to build your own minimal search engine in C++98 + SQLite FTS5


### The Three Pillars of a Search Engine

**1. Crawling** : Collecting pages from the web:

- Fetch URLs
- Parse HTML
- Extract hyperlinks
- Discover new URLs
- Respect robots.txt
- Store raw pages

**2. Indexing** : Converting raw text → searchable structure:
- Tokenization (splitting into words)
- Normalization (lowercase, punctuation removal)
- Stemming/Lemmatization
- Deduplication
- Inverted index creation

**3. Querying & Ranking** : When a user searches:

- Parse query
- Match query against index
- Score documents (BM25, TF-IDF, vector embeddings…)
- Rank by relevance
- Return results

**Real engines add:**
- Caching
- Spelling correction
- Synonyms
- Personalized ranking
- Knowledge graph

### Technologies Used in Modern Search Engines

| Component         | Example Tech                             |
| ----------------- | ---------------------------------------- |
| Crawlers          | C++, Python, Go                          |
| HTML Parsing      | Gumbo, BeautifulSoup, custom parsers     |
| Indexing          | Elasticsearch, Lucene, Solr, SQLite FTS5 |
| Ranking           | BM25, PageRank, ML models                |
| Storage           | RocksDB, Bigtable, LevelDB               |
| Distributed Infra | Kubernetes, Consul, Kafka                |
| Cache             | Redis, Memcached                         |
| Web Server        | Nginx, C++ custom server                 |

### Optimization Techniques Search Engines Use

**A. Inverted Index** : The heart of search engines:
```arduino
word -> [doc1, doc7, doc42, doc88]
```
This makes queries extremely fast.

**B. Tokenization & Normalization**

- Remove punctuation
- Lowercase
- Remove stopwords ("the", "is", etc.)
- Stemming ("running" → "run")
- Unicode normalization

**C. Ranking Algorithms** : Real engines use:

- TF-IDF (term frequency / inverse document frequency)
- BM25 (improved TF-IDF)
- PageRank (link-based authority)
- Neural embeddings (semantic search)

**D. Caching Layers**
- Hot queries cached in Redis
- Query suggestions indexed
- Partial results cached

**E. Compression** : To store billions of docs:

- Variable byte encoding
- Snappy/LZ4 compression
- Sorted postings lists

**F. Parallel & Incremental Crawling** : Large crawlers:

- Use BFS/DFS hybrid strategies
- Distribute URL queues
- Avoid recrawling unchanged pages
- Detect duplicates using fingerprints (SimHash, MinHash)

### Build Your Own Minimal Search Engine
- Using: C++98 + SQLite + FTS5 + HTTP crawler
- This is a real minimal architecture:
```css
[C++98 Crawler] → pages.db (raw HTML)
      ↓
[Indexing via SQLite FTS5] → searchable table
      ↓
[Search API or CLI] → returns results
```

Check The project repo [HERE](https://)
