#include <iostream>
#include <string>
#include <vector>
#include <set>
#include <queue>
#include <regex>
#include <sstream>
#include <thread>
#include <chrono>
#include <curl/curl.h>
#include <sqlite3.h>

// External library for HTML parsing
// Using gumbo-parser for HTML parsing
#include <gumbo.h>


// Configuration
const std::vector<std::string> START_WEBSITES = {
    "https://en.wikipedia.org/wiki/Billie_Eilish",
    "https://en.wikipedia.org/wiki/Elon_Musk",
    "https://en.wikipedia.org/wiki/List_of_most-visited_websites",
    "https://www.imdb.com/?ref_=tt_nv_home",
    "https://www.bbc.com/news",
    "https://www.nationalgeographic.com",
    "https://www.cnn.com",
    "https://www.aljazeera.com",
    "https://www.theverge.com",
    "https://www.techcrunch.com",
    "https://www.nytimes.com",
    "https://www.bloomberg.com",
    "https://www.bbc.co.uk/sport",
    "https://www.imdb.com/chart/top",
    "https://www.github.com",
    "https://www.stackoverflow.com",
    "https://www.biography.com"
};

#define MAX_PAGES_PER_SITE 100 // Max pages to crawl per starting website
#define MAX_DEPTH 3 // Max link depth from starting URL -1 for infinite
#define CRAWL_DELAY_MS 0  // 1 second delay between requests (be polite)

struct RobotsRules {
    std::set<std::string> disallowedPaths;
    std::set<std::string> allowedPaths;
    int crawlDelay = 0;
    bool allowAll = false;
};

struct PageData {
    std::string url;
    std::string title;
    std::string description;
    std::vector<std::string> images;
    std::vector<std::string> tags;
    std::string content;
    std::string rawHtml;
    std::vector<std::string> outgoingLinks;
    std::string favicon;
};

// Callback function for libcurl to write response data
size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append((char*)contents, size * nmemb);
    return size * nmemb;
}

// Function to normalize URLs (remove trailing slashes, fragments, sort query params)
std::string normalizeUrl(const std::string& url) {
    std::string normalized = url;
    
    // Remove fragment (#section)
    size_t fragmentPos = normalized.find('#');
    if (fragmentPos != std::string::npos) {
        normalized = normalized.substr(0, fragmentPos);
    }
    
    // Remove trailing slash (except for root domains)
    if (normalized.length() > 8 && normalized.back() == '/') {
        size_t protocolEnd = normalized.find("://");
        if (protocolEnd != std::string::npos) {
            size_t pathStart = normalized.find('/', protocolEnd + 3);
            // Only remove if it's not just the domain
            if (pathStart != std::string::npos && pathStart < normalized.length() - 1) {
                normalized.pop_back();
            }
        }
    }
    
    // Convert to lowercase (for case-insensitive comparison)
    std::transform(normalized.begin(), normalized.end(), normalized.begin(), ::tolower);
    
    return normalized;
}

// Function to download webpage content
std::string downloadPage(const std::string& url) {
    CURL* curl;
    CURLcode res;
    std::string readBuffer;

    curl = curl_easy_init();
    if(curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        curl_easy_setopt(curl, CURLOPT_MAXREDIRS, 5L);
        
        // Use realistic browser User-Agent to avoid bot detection
        curl_easy_setopt(curl, CURLOPT_USERAGENT, 
            "Mozilla/5.0 (compatible; CustomSearchBot/1.0; +http://example.com/bot)");
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 15L);
        curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 10L);
        
        // Enable automatic decompression (gzip, deflate, etc.)
        curl_easy_setopt(curl, CURLOPT_ACCEPT_ENCODING, "");
        
        // Add common headers
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
        headers = curl_slist_append(headers, "Accept-Language: en-US,en;q=0.9");
        headers = curl_slist_append(headers, "Cache-Control: no-cache");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        
        // SSL verification
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 2L);
        
        res = curl_easy_perform(curl);
        
        curl_slist_free_all(headers);
        
        if(res != CURLE_OK) {
            std::cerr << "curl_easy_perform() failed: " << curl_easy_strerror(res) << std::endl;
            readBuffer.clear();
        }
        
        curl_easy_cleanup(curl);
    }
    return readBuffer;
}

// Function to fetch and parse robots.txt
RobotsRules fetchRobotsTxt(const std::string& baseUrl) {
    RobotsRules rules;
    
    // Extract domain from URL
    size_t pos = baseUrl.find("://");
    if (pos == std::string::npos) return rules;
    
    size_t domainEnd = baseUrl.find('/', pos + 3);
    std::string domain = (domainEnd != std::string::npos) ? 
                        baseUrl.substr(0, domainEnd) : baseUrl;
    
    std::string robotsUrl = domain + "/robots.txt";
    std::string robotsTxt = downloadPage(robotsUrl);
    
    if (robotsTxt.empty()) {
        rules.allowAll = true;
        return rules;
    }
    
    // Parse robots.txt (simple parser for User-agent: *)
    std::istringstream stream(robotsTxt);
    std::string line;
    bool inOurSection = false;
    
    while (std::getline(stream, line)) {
        // Trim whitespace
        line.erase(0, line.find_first_not_of(" \t\r\n"));
        line.erase(line.find_last_not_of(" \t\r\n") + 1);
        
        // Skip empty lines and comments
        if (line.empty() || line[0] == '#') continue;
        
        // Check for User-agent
        if (line.find("User-agent:") == 0) {
            std::string agent = line.substr(11);
            agent.erase(0, agent.find_first_not_of(" \t"));
            
            // If we found our section and hit a new User-agent, we're done
            if (inOurSection) {
                break;
            }
            
            // Check if this is our section (User-agent: *)
            if (agent == "*") {
                inOurSection = true;
            }
            continue;  // Don't process the User-agent line itself
        }
        
        // Only parse rules if we're in our section
        if (inOurSection) {
            // Parse Disallow
            if (line.find("Disallow:") == 0) {
                std::string path = line.substr(9);
                path.erase(0, path.find_first_not_of(" \t"));
                if (!path.empty()) {
                    rules.disallowedPaths.insert(path);
                }
            }
            
            // Parse Allow
            if (line.find("Allow:") == 0) {
                std::string path = line.substr(6);
                path.erase(0, path.find_first_not_of(" \t"));
                if (!path.empty()) {
                    rules.allowedPaths.insert(path);
                }
            }
            
            // Parse Crawl-delay
            if (line.find("Crawl-delay:") == 0) {
                std::string delay = line.substr(12);
                delay.erase(0, delay.find_first_not_of(" \t"));
                try {
                    rules.crawlDelay = std::stoi(delay);
                } catch (...) {}
            }
        }
    }
    
    return rules;
}

// Check if URL is allowed by robots.txt
bool isAllowedByRobots(const std::string& url, const RobotsRules& rules) {
    if (rules.allowAll) return true;
    
    // Extract path from URL
    size_t pos = url.find("://");
    if (pos == std::string::npos) return false;
    
    size_t pathStart = url.find('/', pos + 3);
    if (pathStart == std::string::npos) return true;
    
    std::string path = url.substr(pathStart);
    
    // First check if explicitly allowed (Allow rules take precedence)
    for (const auto& allowed : rules.allowedPaths) {
        if (!allowed.empty() && allowed.back() == '*') {
            std::string prefix = allowed.substr(0, allowed.length() - 1);
            if (path.find(prefix) == 0) {
                return true;
            }
        } else if (path.find(allowed) == 0) {
            return true;
        }
    }
    
    // Check if path matches any disallowed pattern
    for (const auto& disallowed : rules.disallowedPaths) {
        if (disallowed == "/") {
            return false;  // Disallow all
        }
        
        // Check if disallowed ends with * (wildcard)
        if (!disallowed.empty() && disallowed.back() == '*') {
            std::string prefix = disallowed.substr(0, disallowed.length() - 1);
            if (path.find(prefix) == 0) {
                return false;
            }
        } 
        // Exact match or prefix match for paths ending with /
        else if (path == disallowed || 
                 (disallowed.back() == '/' && path.find(disallowed) == 0)) {
            return false;
        }
        // For non-slash endings, only match if followed by / or end of string
        else if (path.find(disallowed) == 0) {
            size_t matchEnd = disallowed.length();
            if (matchEnd == path.length() || path[matchEnd] == '/' || path[matchEnd] == '?') {
                return false;
            }
        }
    }
    
    return true;
}

// Function to extract text from a Gumbo node (excluding script and style tags)
void extractText(GumboNode* node, std::string& text) {
    if (node->type == GUMBO_NODE_TEXT) {
        text += node->v.text.text;
        text += " ";
    } else if (node->type == GUMBO_NODE_ELEMENT) {
        // Skip script, style, and noscript tags
        GumboTag tag = node->v.element.tag;
        if (tag == GUMBO_TAG_SCRIPT || tag == GUMBO_TAG_STYLE || 
            tag == GUMBO_TAG_NOSCRIPT || tag == GUMBO_TAG_IFRAME) {
            return;
        }
        
        GumboVector* children = &node->v.element.children;
        for (unsigned int i = 0; i < children->length; ++i) {
            extractText(static_cast<GumboNode*>(children->data[i]), text);
        }
    }
}

// Function to search for specific tags in the HTML tree
void searchForTag(GumboNode* node, GumboTag tag, std::vector<GumboNode*>& results) {
    if (node->type != GUMBO_NODE_ELEMENT) {
        return;
    }
    if (node->v.element.tag == tag) {
        results.push_back(node);
    }

    GumboVector* children = &node->v.element.children;
    for (unsigned int i = 0; i < children->length; ++i) {
        searchForTag(static_cast<GumboNode*>(children->data[i]), tag, results);
    }
}

// Function to get attribute value from a node
std::string getAttribute(GumboNode* node, const char* attr_name) {
    GumboAttribute* attr = gumbo_get_attribute(&node->v.element.attributes, attr_name);
    if (attr) {
        return std::string(attr->value);
    }
    return "";
}

// Function to check if URL has a valid image extension and is not an icon
bool isValidImageUrl(const std::string& url) {
    // Convert to lowercase for comparison
    std::string lowerUrl = url;
    std::transform(lowerUrl.begin(), lowerUrl.end(), lowerUrl.begin(), ::tolower);
    
    // Remove query parameters for extension check
    size_t queryPos = lowerUrl.find('?');
    if (queryPos != std::string::npos) {
        lowerUrl = lowerUrl.substr(0, queryPos);
    }
    
    // Exclude only obvious non-image formats
    if (lowerUrl.find(".ico") != std::string::npos ||
        lowerUrl.find(".gif") != std::string::npos ||
        lowerUrl.find("favicon") != std::string::npos) {
        return false;
    }
    
    // Accept standard image formats
    return (lowerUrl.find(".jpg") != std::string::npos ||
            lowerUrl.find(".jpeg") != std::string::npos ||
            lowerUrl.find(".png") != std::string::npos ||
            lowerUrl.find(".webp") != std::string::npos ||
            lowerUrl.find(".svg") != std::string::npos );
}

// Function to extract links from HTML
std::vector<std::string> extractLinks(const std::string& html, const std::string& baseUrl) {
    std::vector<std::string> links;
    std::set<std::string> uniqueLinks;  // Avoid duplicates
    GumboOutput* output = gumbo_parse(html.c_str());
    
    std::vector<GumboNode*> anchorNodes;
    searchForTag(output->root, GUMBO_TAG_A, anchorNodes);
    
    for (GumboNode* node : anchorNodes) {
        std::string href = getAttribute(node, "href");
        if (href.empty()) continue;
        
        // Skip anchors, mailto, javascript, etc.
        if (href[0] == '#' || 
            href.find("mailto:") == 0 || 
            href.find("javascript:") == 0 ||
            href.find("tel:") == 0) {
            continue;
        }
        
        // Convert relative URLs to absolute
        if (href[0] == '/' && href[1] != '/') {
            // Relative path
            size_t pos = baseUrl.find("://");
            if (pos != std::string::npos) {
                size_t domainEnd = baseUrl.find('/', pos + 3);
                std::string domain = (domainEnd != std::string::npos) ? 
                                    baseUrl.substr(0, domainEnd) : baseUrl;
                href = domain + href;
            }
        } else if (href.find("//") == 0) {
            // Protocol-relative URL
            size_t pos = baseUrl.find("://");
            if (pos != std::string::npos) {
                std::string protocol = baseUrl.substr(0, pos);
                href = protocol + ":" + href;
            }
        } else if (href.find("http") != 0) {
            // Relative URL without leading slash
            continue;
        }
        
        // Add to unique set then vector
        if (uniqueLinks.find(href) == uniqueLinks.end()) {
            uniqueLinks.insert(href);
            links.push_back(href);
        }
    }
    
    gumbo_destroy_output(&kGumboDefaultOptions, output);
    return links;
}

// Function to parse HTML and extract page data
PageData parseHTML(const std::string& html, const std::string& url) {
    PageData data;
    data.url = url;
    data.rawHtml = html;  // Store raw HTML
    
    GumboOutput* output = gumbo_parse(html.c_str());
    
    // Extract title
    std::vector<GumboNode*> titleNodes;
    searchForTag(output->root, GUMBO_TAG_TITLE, titleNodes);
    if (!titleNodes.empty()) {
        extractText(titleNodes[0], data.title);
        // Trim whitespace
        data.title.erase(0, data.title.find_first_not_of(" \n\r\t"));
        data.title.erase(data.title.find_last_not_of(" \n\r\t") + 1);
    }
    
    // Extract meta description
    std::vector<GumboNode*> metaNodes;
    searchForTag(output->root, GUMBO_TAG_META, metaNodes);
    for (GumboNode* node : metaNodes) {
        std::string name = getAttribute(node, "name");
        std::string property = getAttribute(node, "property");
        if (name == "description" || property == "og:description") {
            data.description = getAttribute(node, "content");
            if (!data.description.empty()) {
                // Use meta description as content (like Google does)
                data.content = data.description;
                break;
            }
        }
    }
    
    // Extract favicon
    std::vector<GumboNode*> linkNodes;
    searchForTag(output->root, GUMBO_TAG_LINK, linkNodes);
    for (GumboNode* node : linkNodes) {
        std::string rel = getAttribute(node, "rel");
        if (rel.find("icon") != std::string::npos) {
            std::string href = getAttribute(node, "href");
            if (!href.empty()) {
                // Convert relative URLs to absolute
                if (href[0] == '/' && href[1] == '/') {
                    href = "https:" + href;
                } else if (href[0] == '/') {
                    size_t pos = url.find("://");
                    if (pos != std::string::npos) {
                        size_t domainEnd = url.find('/', pos + 3);
                        std::string domain = (domainEnd != std::string::npos) ? 
                                            url.substr(0, domainEnd) : url;
                        href = domain + href;
                    }
                } else if (href.find("http") != 0) {
                    // Relative URL
                    size_t pos = url.find("://");
                    if (pos != std::string::npos) {
                        size_t domainEnd = url.find('/', pos + 3);
                        std::string domain = (domainEnd != std::string::npos) ? 
                                            url.substr(0, domainEnd) : url;
                        href = domain + "/" + href;
                    }
                }
                data.favicon = href;
                break;
            }
        }
    }
    
    // If no favicon found in links, try default /favicon.ico
    if (data.favicon.empty()) {
        size_t pos = url.find("://");
        if (pos != std::string::npos) {
            size_t domainEnd = url.find('/', pos + 3);
            std::string domain = (domainEnd != std::string::npos) ? 
                                url.substr(0, domainEnd) : url;
            data.favicon = domain + "/favicon.ico";
        }
    }
    
    // Extract keywords/tags
    for (GumboNode* node : metaNodes) {
        std::string name = getAttribute(node, "name");
        if (name == "keywords") {
            std::string keywords = getAttribute(node, "content");
            // Split by comma
            std::stringstream ss(keywords);
            std::string tag;
            while (std::getline(ss, tag, ',')) {
                // Trim whitespace
                tag.erase(0, tag.find_first_not_of(" \n\r\t"));
                tag.erase(tag.find_last_not_of(" \n\r\t") + 1);
                if (!tag.empty()) {
                    data.tags.push_back(tag);
                }
            }
        }
    }
    
    // Extract outgoing links (discovered URLs)
    data.outgoingLinks = extractLinks(html, url);
    
    // If no meta description found, extract from main content
    if (data.content.empty()) {
        std::vector<GumboNode*> contentNodes;
        searchForTag(output->root, GUMBO_TAG_ARTICLE, contentNodes);
        if (contentNodes.empty()) {
            searchForTag(output->root, GUMBO_TAG_MAIN, contentNodes);
        }
        if (contentNodes.empty()) {
            searchForTag(output->root, GUMBO_TAG_BODY, contentNodes);
        }
        
        if (!contentNodes.empty()) {
            // For Wikipedia and similar sites, find the first paragraph
            std::vector<GumboNode*> paragraphs;
            searchForTag(contentNodes[0], GUMBO_TAG_P, paragraphs);
            
            // Extract text from first few paragraphs (skip navigation/table of contents)
            for (GumboNode* p : paragraphs) {
                std::string paraText;
                extractText(p, paraText);
                
                // Skip short paragraphs (likely navigation/UI elements)
                if (paraText.length() < 50) continue;
                
                // Skip if it looks like navigation (contains "Toggle", "languages", etc.)
                if (paraText.find("Toggle") != std::string::npos ||
                    paraText.find("languages") != std::string::npos ||
                    paraText.find("Jump to") != std::string::npos) {
                    continue;
                }
                
                data.content += paraText + " ";
                
                // Get first 1-3 paragraphs of real content
                if (data.content.length() > 500) break;
            }
            
            // If still no good content, fallback to full body text
            if (data.content.length() < 100) {
                data.content.clear();
                extractText(contentNodes[0], data.content);
            }
            
            // Clean up content
            std::regex multiSpace("\\s+");
            data.content = std::regex_replace(data.content, multiSpace, " ");
            
            // Trim
            data.content.erase(0, data.content.find_first_not_of(" \n\r\t"));
            data.content.erase(data.content.find_last_not_of(" \n\r\t") + 1);
            
            // Limit content to 2000 chars
            if (data.content.length() > 2000) {
                data.content = data.content.substr(0, 2000) + "...";
            }
        }
    }
    
    // Extract images from main content area (Google-style)
    std::vector<GumboNode*> contentNodes;
    searchForTag(output->root, GUMBO_TAG_ARTICLE, contentNodes);
    if (contentNodes.empty()) {
        searchForTag(output->root, GUMBO_TAG_MAIN, contentNodes);
    }
    if (contentNodes.empty()) {
        searchForTag(output->root, GUMBO_TAG_BODY, contentNodes);
    }
    
    if (!contentNodes.empty()) {
        // Extract images from main content area only
        std::vector<GumboNode*> imgNodes;
        std::set<std::string> seenImages;
        searchForTag(contentNodes[0], GUMBO_TAG_IMG, imgNodes);
        
        for (GumboNode* node : imgNodes) {
            std::string src = getAttribute(node, "src");
            if (src.empty()) continue;
            
            // Convert relative URLs to absolute
            if (src[0] == '/' && src[1] == '/') {
                src = "https:" + src;
            } else if (src[0] == '/') {
                size_t pos = url.find("://");
                if (pos != std::string::npos) {
                    size_t domainEnd = url.find('/', pos + 3);
                    std::string domain = (domainEnd != std::string::npos) ? 
                                        url.substr(0, domainEnd) : url;
                    src = domain + src;
                }
            }
            
            // Only add valid, unique images
            if (isValidImageUrl(src) && seenImages.find(src) == seenImages.end()) {
                data.images.push_back(src);
                seenImages.insert(src);
            }
        }
    }
    
    gumbo_destroy_output(&kGumboDefaultOptions, output);
    return data;
}

// Function to validate page quality (filter out Cloudflare, bot checks, low-quality pages)
bool isValidPage(const PageData& data) {
    // Check for Cloudflare or bot protection pages
    if (data.title.find("Just a moment") != std::string::npos ||
        data.title.find("Attention Required") != std::string::npos ||
        data.title.find("Please verify you are human") != std::string::npos ||
        data.title.find("Access denied") != std::string::npos ||
        data.title.find("403 Forbidden") != std::string::npos ||
        data.title.find("404 Not Found") != std::string::npos) {
        return false;
    }
    
    // Check for minimal content length (reduced for dynamic sites like IMDB)
    if (data.content.length() < 20) {
        return false;
    }
    
    // Check if title is empty (but allow short titles)
    if (data.title.empty()) {
        return false;
    }
    
    // Relax JavaScript check - only filter if heavily dominated by JS
    size_t jsIndicators = 0;
    if (data.content.find("window.ytcsi") != std::string::npos) jsIndicators++;
    if (data.content.find("document.getElementById") != std::string::npos) jsIndicators++;
    if (data.content.find("addEventListener") != std::string::npos) jsIndicators++;
    if (data.content.find("var ") != std::string::npos) jsIndicators++;
    if (data.content.find("const ") != std::string::npos) jsIndicators++;
    
    // Only reject if 4 or more JS indicators (very strict)
    if (jsIndicators >= 4) {
        return false;
    }
    
    return true;
}

// Function to initialize SQLite database
sqlite3* initDatabase(const char* dbName) {
    sqlite3* db;
    char* errMsg = 0;
    
    int rc = sqlite3_open(dbName, &db);
    if (rc) {
        std::cerr << "Can't open database: " << sqlite3_errmsg(db) << std::endl;
        return nullptr;
    }
    
    // Create tables
    const char* sql = 
        "CREATE TABLE IF NOT EXISTS pages ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "url TEXT UNIQUE NOT NULL,"
        "title TEXT,"
        "description TEXT,"
        "content TEXT,"
        "raw_html TEXT,"
        "favicon TEXT,"
        "crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP"
        ");"
        
        "CREATE TABLE IF NOT EXISTS images ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "page_id INTEGER,"
        "image_url TEXT,"
        "FOREIGN KEY(page_id) REFERENCES pages(id)"
        ");"
        
        "CREATE TABLE IF NOT EXISTS tags ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "page_id INTEGER,"
        "tag TEXT,"
        "FOREIGN KEY(page_id) REFERENCES pages(id)"
        ");"
        
        "CREATE TABLE IF NOT EXISTS links ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "source_page_id INTEGER,"
        "target_url TEXT,"
        "FOREIGN KEY(source_page_id) REFERENCES pages(id)"
        ");"
        
        // FTS5 virtual table for full-text search
        "CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5("
        "title, "
        "description, "
        "content, "
        "content='pages', "
        "content_rowid='id'"
        ");"
        
        // Triggers to keep FTS5 table in sync with pages table
        "CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN "
        "INSERT INTO pages_fts(rowid, title, description, content) "
        "VALUES (new.id, new.title, new.description, new.content); "
        "END;"
        
        "CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN "
        "INSERT INTO pages_fts(pages_fts, rowid, title, description, content) "
        "VALUES('delete', old.id, old.title, old.description, old.content); "
        "END;"
        
        "CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE ON pages BEGIN "
        "INSERT INTO pages_fts(pages_fts, rowid, title, description, content) "
        "VALUES('delete', old.id, old.title, old.description, old.content); "
        "INSERT INTO pages_fts(rowid, title, description, content) "
        "VALUES (new.id, new.title, new.description, new.content); "
        "END;"
        
        // Create index on URL for faster duplicate checking
        "CREATE INDEX IF NOT EXISTS idx_pages_url ON pages(url);"
        "CREATE INDEX IF NOT EXISTS idx_images_page_id ON images(page_id);"
        "CREATE INDEX IF NOT EXISTS idx_links_source_page_id ON links(source_page_id);";
    
    rc = sqlite3_exec(db, sql, 0, 0, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return nullptr;
    }
    
    std::cout << "Database initialized successfully" << std::endl;
    return db;
}

// Function to save page data to database
bool saveToDatabase(sqlite3* db, const PageData& data) {
    char* errMsg = 0;
    
    // Begin transaction
    int rc = sqlite3_exec(db, "BEGIN TRANSACTION", 0, 0, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to begin transaction: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    // Prepare INSERT statement for pages
    sqlite3_stmt* stmt;
    const char* sql = "INSERT OR IGNORE INTO pages (url, title, description, content, raw_html, favicon) VALUES (?, ?, ?, ?, ?, ?)";
    
    rc = sqlite3_prepare_v2(db, sql, -1, &stmt, 0);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to prepare statement: " << sqlite3_errmsg(db) << std::endl;
        sqlite3_exec(db, "ROLLBACK", 0, 0, 0);
        return false;
    }
    
    sqlite3_bind_text(stmt, 1, data.url.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, data.title.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, data.description.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, data.content.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, data.rawHtml.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, data.favicon.c_str(), -1, SQLITE_TRANSIENT);
    
    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    
    if (rc != SQLITE_DONE) {
        if (rc == SQLITE_CONSTRAINT) {
            // URL already exists, skip - commit transaction and return
            sqlite3_exec(db, "COMMIT", 0, 0, 0);
            return true;
        }
        std::cerr << "Failed to insert page: " << sqlite3_errmsg(db) << std::endl;
        sqlite3_exec(db, "ROLLBACK", 0, 0, 0);
        return false;
    }
    
    // Get the page ID
    sqlite3_int64 pageId = sqlite3_last_insert_rowid(db);
    
    // Insert images
    for (const auto& img : data.images) {
        const char* imgSql = "INSERT INTO images (page_id, image_url) VALUES (?, ?)";
        rc = sqlite3_prepare_v2(db, imgSql, -1, &stmt, 0);
        if (rc == SQLITE_OK) {
            sqlite3_bind_int64(stmt, 1, pageId);
            sqlite3_bind_text(stmt, 2, img.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_step(stmt);
            sqlite3_finalize(stmt);
        }
    }
    
    // Insert tags
    for (const auto& tag : data.tags) {
        const char* tagSql = "INSERT INTO tags (page_id, tag) VALUES (?, ?)";
        rc = sqlite3_prepare_v2(db, tagSql, -1, &stmt, 0);
        if (rc == SQLITE_OK) {
            sqlite3_bind_int64(stmt, 1, pageId);
            sqlite3_bind_text(stmt, 2, tag.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_step(stmt);
            sqlite3_finalize(stmt);
        }
    }
    
    // Insert outgoing links (discovered URLs)
    for (const auto& link : data.outgoingLinks) {
        const char* linkSql = "INSERT INTO links (source_page_id, target_url) VALUES (?, ?)";
        rc = sqlite3_prepare_v2(db, linkSql, -1, &stmt, 0);
        if (rc == SQLITE_OK) {
            sqlite3_bind_int64(stmt, 1, pageId);
            sqlite3_bind_text(stmt, 2, link.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_step(stmt);
            sqlite3_finalize(stmt);
        }
    }
    
    // Commit transaction
    rc = sqlite3_exec(db, "COMMIT", 0, 0, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to commit transaction: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        sqlite3_exec(db, "ROLLBACK", 0, 0, 0);
        return false;
    }
    
    return true;
}

// Function to check if URL already exists in database
bool urlExistsInDatabase(sqlite3* db, const std::string& url) {
    sqlite3_stmt* stmt;
    const char* sql = "SELECT COUNT(*) FROM pages WHERE url = ?";
    
    int rc = sqlite3_prepare_v2(db, sql, -1, &stmt, 0);
    if (rc != SQLITE_OK) {
        return false;  // Assume doesn't exist if query fails
    }
    
    sqlite3_bind_text(stmt, 1, url.c_str(), -1, SQLITE_TRANSIENT);
    
    int count = 0;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        count = sqlite3_column_int(stmt, 0);
    }
    
    sqlite3_finalize(stmt);
    return count > 0;
}

// Main crawler function
void crawl(const std::string& startUrl, sqlite3* db, int maxPages = MAX_PAGES_PER_SITE, int maxDepth = MAX_DEPTH) {
    std::queue<std::pair<std::string, int>> urlQueue;  // pair of (url, depth)
    std::set<std::string> visited;
    
    // Fetch robots.txt rules
    std::cout << "Fetching robots.txt..." << std::endl;
    RobotsRules robotsRules = fetchRobotsTxt(startUrl);
    int crawlDelay = std::max(robotsRules.crawlDelay * 1000, CRAWL_DELAY_MS);
    std::cout << "Crawl delay: " << crawlDelay << "ms" << std::endl;
    std::cout << "Disallowed paths: " << robotsRules.disallowedPaths.size() << std::endl;
    
    urlQueue.push({startUrl, 0});  // Start with depth 0
    int pageCount = 0;
    
    while (!urlQueue.empty() && pageCount < maxPages) {
        auto [currentUrl, currentDepth] = urlQueue.front();
        urlQueue.pop();
        
        // Normalize URL to prevent duplicates
        std::string normalizedUrl = normalizeUrl(currentUrl);
        
        // Skip if already visited
        if (visited.find(normalizedUrl) != visited.end()) {
            continue;
        }
        
        // Check robots.txt
        if (!isAllowedByRobots(currentUrl, robotsRules)) {
            continue;
        }
        
        visited.insert(normalizedUrl);
        pageCount++;
        
        // Check if URL already exists in database (skip re-crawling)
        if (urlExistsInDatabase(db, currentUrl)) {
            std::cout << "Skipping [" << pageCount << "/" << maxPages << "] (already in DB): " << currentUrl << std::endl;
            continue;
        }
        
        std::cout << "Crawling [" << pageCount << "/" << maxPages << "] (depth: " << currentDepth << "): " << currentUrl << std::endl;
        
        // Polite crawl delay
        if (pageCount > 1) {
            std::this_thread::sleep_for(std::chrono::milliseconds(crawlDelay));
        }
        
        // Download page
        std::string html = downloadPage(currentUrl);
        if (html.empty()) {
            std::cerr << "Failed to download: " << currentUrl << std::endl;
            continue;
        }
        
        // Parse HTML and extract data
        PageData data = parseHTML(html, currentUrl);
        
        // Debug output
        std::cout << "  - Title: \"" << data.title << "\"" << std::endl;
        std::cout << "  - Content length: " << data.content.length() << " chars" << std::endl;
        std::cout << "  - Content preview: \"" << data.content.substr(0, std::min((size_t)100, data.content.length())) << "...\"" << std::endl;
        std::cout << "  - Discovered URLs: " << data.outgoingLinks.size() << std::endl;
        
        // Validate page quality before saving
        if (!isValidPage(data)) {
            std::cout << "  ✗ Skipped (failed validation)" << std::endl;
            continue;
        }
        
        // Save to database
        if (saveToDatabase(db, data)) {
            std::cout << "  ✓ Saved successfully!" << std::endl;
            std::cout << "  - Images: " << data.images.size() << std::endl;
        }
        
        // Extract links and add to queue (only if within depth limit)
        if (maxDepth == -1 || currentDepth < maxDepth) {
            // Extract base domain from start URL (no subdomains)
            std::string baseDomain = startUrl;
            size_t protocolEnd = baseDomain.find("://");
            if (protocolEnd != std::string::npos) {
                baseDomain = baseDomain.substr(protocolEnd + 3);
            }
            size_t pathStart = baseDomain.find('/');
            if (pathStart != std::string::npos) {
                baseDomain = baseDomain.substr(0, pathStart);
            }
            // Remove www. prefix if present
            if (baseDomain.substr(0, 4) == "www.") {
                baseDomain = baseDomain.substr(4);
            }
            
            for (const auto& link : data.outgoingLinks) {
                // Extract domain from link
                std::string linkDomain = link;
                size_t linkProtocolEnd = linkDomain.find("://");
                if (linkProtocolEnd != std::string::npos) {
                    linkDomain = linkDomain.substr(linkProtocolEnd + 3);
                }
                size_t linkPathStart = linkDomain.find('/');
                if (linkPathStart != std::string::npos) {
                    linkDomain = linkDomain.substr(0, linkPathStart);
                }
                // Remove www. prefix if present
                if (linkDomain.substr(0, 4) == "www.") {
                    linkDomain = linkDomain.substr(4);
                }
                
                // Only crawl if exact domain match (no subdomains)
                std::string normalizedLink = normalizeUrl(link);
                if (linkDomain == baseDomain && visited.find(normalizedLink) == visited.end()) {
                    urlQueue.push({link, currentDepth + 1});
                }
            }
        }
    }
    
    std::cout << "\nCrawling completed! Total pages crawled: " << pageCount << std::endl;
}

int main(void) {
    // Initialize libcurl
    curl_global_init(CURL_GLOBAL_DEFAULT);
    
    // Get database path from environment or use default
    const char* db_path_env = std::getenv("DB_PATH");
    std::string db_path = db_path_env ? db_path_env : "crawler_data.db";
    
    // Initialize database
    sqlite3* db = initDatabase(db_path.c_str());
    if (!db) {
        curl_global_cleanup();
        return 1;
    }
    
    std::cout << "Starting web crawler..." << std::endl;
    std::cout << "Database path: " << db_path << std::endl;
    std::cout << "Total sites to crawl: " << START_WEBSITES.size() << std::endl;
    std::cout << "Max pages per site: " << MAX_PAGES_PER_SITE << std::endl;
    std::cout << "Max depth: " << (MAX_DEPTH == -1 ? "unlimited" : std::to_string(MAX_DEPTH)) << std::endl;
    std::cout << "-----------------------------------" << std::endl;
    
    // Crawl each website
    for (size_t i = 0; i < START_WEBSITES.size(); i++) {
        std::cout << "\n[SITE " << (i + 1) << "/" << START_WEBSITES.size() << "] " << START_WEBSITES[i] << std::endl;
        std::cout << "-----------------------------------" << std::endl;
        crawl(START_WEBSITES[i], db, MAX_PAGES_PER_SITE, MAX_DEPTH);
    }
    
    // Cleanup
    sqlite3_close(db);
    curl_global_cleanup();
    
    std::cout << "\n==================================" << std::endl;
    std::cout << "All sites crawled successfully!" << std::endl;
    std::cout << "Database saved as '" << db_path << "'" << std::endl;
    return 0;
}