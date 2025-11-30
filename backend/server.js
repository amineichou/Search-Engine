const express = require('express');
require('dotenv').config();
const cors = require('cors');
const db = require('./db');
const natural = require('natural');
const NodeCache = require('node-cache');
const nlp = require('compromise');
const UserPreferences = require('./userPreferences');
const didYouMean = require('didyoumean');
const levenshtein = require('fast-levenshtein');

const app = express();
app.use(express.json());

// Initialize user preferences tracker
const userPrefs = new UserPreferences();

// Initialize cache (TTL: 5 minutes, check period: 10 minutes)
const searchCache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

// Initialize tokenizer and stemmer
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const stopwords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with',
    'to', 'for', 'of', 'as', 'by', 'from', 'that', 'this', 'it', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'should', 'could', 'can', 'may', 'might', 'must', 'shall'
]);

// Common synonyms for better search results
const synonyms = {
    'pic': ['picture', 'image', 'photo'],
    'picture': ['pic', 'image', 'photo'],
    'photo': ['picture', 'image', 'pic'],
    'movie': ['film', 'cinema'],
    'film': ['movie', 'cinema'],
    'song': ['music', 'track'],
    'music': ['song', 'track'],
    'artist': ['musician', 'singer'],
    'musician': ['artist', 'singer'],
    'singer': ['artist', 'musician'],
    'actor': ['actress', 'performer'],
    'actress': ['actor', 'performer'],
    'book': ['novel', 'publication'],
    'novel': ['book', 'publication']
};

// Extract knowledge graph info dynamically from database
function getKnowledgeGraphInfo(query, callback) {
    const lowerQuery = query.toLowerCase().trim();
    
    // Search for exact or close title match in database
    const sql = `
        SELECT title, url, description, content
        FROM pages
        WHERE LOWER(TRIM(title)) = LOWER(TRIM(?))
           OR LOWER(TRIM(title)) LIKE LOWER(TRIM(?) || ' - %')
           OR LOWER(TRIM(title)) LIKE LOWER('%' || ? || '%')
        LIMIT 1
    `;
    
    db.get(sql, [lowerQuery, lowerQuery, lowerQuery], (err, row) => {
        if (err || !row) {
            callback(null);
            return;
        }
        
        let description = row.description || '';
        
        // If no description, extract most relevant sentence from content
        if (!description && row.content) {
            const doc = nlp(row.content);
            const sentences = doc.sentences().out('array');
            const relevantSentence = sentences.find(sentence => 
                sentence.length > 20 && sentence.length < 200
            );
            description = relevantSentence || '';
        }
        
        // Simple knowledge card with only title, url, and description
        const knowledgeCard = {
            title: row.title,
            url: row.url,
            description: description
        };
        
        callback(knowledgeCard);
    });
}

// Dictionary of common words from database (built dynamically)
let commonWords = new Set();

// Build dictionary from database on startup
function buildDictionary() {
    const sql = 'SELECT DISTINCT title, description FROM pages LIMIT 1000';
    db.all(sql, [], (err, rows) => {
        if (!err && rows) {
            rows.forEach(row => {
                if (row.title) {
                    tokenizer.tokenize(row.title.toLowerCase()).forEach(word => {
                        if (word.length > 2) commonWords.add(word);
                    });
                }
                if (row.description) {
                    tokenizer.tokenize(row.description.toLowerCase()).forEach(word => {
                        if (word.length > 2) commonWords.add(word);
                    });
                }
            });
        }
    });
}

// Call on startup
buildDictionary();

// Spelling correction using didyoumean library
function correctSpelling(query) {
    const words = query.toLowerCase().split(' ');
    let hasCorrection = false;
    
    const correctedWords = words.map(word => {
        // Skip very short words and stopwords
        if (word.length <= 2 || stopwords.has(word)) {
            return word;
        }
        
        // Try to find suggestion from our dictionary
        const suggestion = didYouMean(word, Array.from(commonWords), {
            threshold: 0.4,
            thresholdType: 'similarity'
        });
        
        if (suggestion && suggestion !== word) {
            hasCorrection = true;
            return suggestion;
        }
        
        return word;
    });
    
    return hasCorrection ? correctedWords.join(' ') : null;
}

// Function to expand query with synonyms
function expandWithSynonyms(tokens) {
    const expanded = new Set(tokens);
    tokens.forEach(token => {
        if (synonyms[token]) {
            synonyms[token].forEach(syn => expanded.add(syn));
        }
    });
    return Array.from(expanded);
}

// Function to normalize and tokenize search query
function normalizeQuery(query) {
    // Unicode normalization (NFC - canonical decomposition followed by canonical composition)
    let normalized = query.normalize('NFC');
    
    // Lowercase
    normalized = normalized.toLowerCase();
    
    // Remove punctuation and tokenize
    const tokens = tokenizer.tokenize(normalized);
    
    // Remove stopwords but keep original tokens too
    const processedTokens = tokens
        .filter(token => token.length > 1) // Remove single characters
        .filter(token => !stopwords.has(token)); // Remove stopwords
    
    // Return both original and stemmed tokens for better matching
    const stemmedTokens = processedTokens.map(token => stemmer.stem(token));
    
    // Combine original and stemmed (remove duplicates)
    return [...new Set([...processedTokens, ...stemmedTokens])];
}

app.use(cors(
    {
        origin: ['http://localhost:5173', 'http://localhost:5174'],
        optionsSuccessStatus: 200
    }
));

app.get("/health", (req, res) => {
    res.send("OK");
});

app.get("/images", (req, res) => {
    const query = req.query.q;
    
    if (!query || query.trim() === '') {
        return res.json([]);
    }
    
    // Check for spelling correction
    const correctedQuery = correctSpelling(query);
    
    // Check cache first
    const cacheKey = `images_${query.toLowerCase().trim()}`;
    const cachedResults = searchCache.get(cacheKey);
    if (cachedResults) {
        return res.json({
            results: cachedResults,
            suggestion: correctedQuery
        });
    }
    
    // Normalize and tokenize the query
    let processedTokens = normalizeQuery(query);
    processedTokens = expandWithSynonyms(processedTokens);
    
    if (processedTokens.length === 0) {
        return res.json([]);
    }
    
    // Build FTS5 query
    const ftsQuery = processedTokens.join(' OR ');
    
    // Query images from pages that match the search
    const sql = `
        SELECT DISTINCT i.image_url, p.title, p.url,
               CASE
                   WHEN LOWER(TRIM(p.title)) = LOWER(TRIM(?)) THEN 1
                   WHEN LOWER(TRIM(p.title)) LIKE LOWER(TRIM(?) || ' - %') THEN 2
                   WHEN LOWER(p.title) LIKE LOWER(? || '%') THEN 3
                   WHEN LOWER(p.title) LIKE LOWER('%' || ? || '%') THEN 4
                   ELSE 5
               END as title_priority,
               LENGTH(p.title) as title_length
        FROM images i
        INNER JOIN pages p ON i.page_id = p.id
        INNER JOIN pages_fts ON pages_fts.rowid = p.id
        WHERE pages_fts MATCH ?
        ORDER BY title_priority ASC, title_length ASC, rank ASC
        LIMIT 100
    `;
    
    db.all(sql, [query.toLowerCase().trim(), query.toLowerCase().trim(), query.toLowerCase().trim(), query.toLowerCase().trim(), ftsQuery], (err, rows) => {
        if (err) {
            console.error("Database error:", err);
            res.status(500).send("Database error");
        } else {
            const response = {
                results: rows || [],
                suggestion: correctedQuery
            };
            // Cache the results
            searchCache.set(cacheKey, rows || []);
            res.json(response);
        }
    });
});


app.get("/search", (req, res) => {
    const query = req.query.q;
    const enablePersonalization = req.query.personalize !== 'false';
    
    if (!query || query.trim() === '') {
        return res.json([]);
    }
    
    // Check for spelling correction
    const correctedQuery = correctSpelling(query);
    
    // Record search in user history
    userPrefs.recordSearch(query);
    
    // Check cache first
    const cacheKey = `search_${query.toLowerCase().trim()}`;
    const cachedResults = searchCache.get(cacheKey);
    if (cachedResults) {
        // Apply personalization even for cached results if enabled
        if (enablePersonalization && Array.isArray(cachedResults)) {
            return res.json({
                results: userPrefs.personalizeResults(cachedResults),
                suggestion: correctedQuery
            });
        } else if (enablePersonalization && cachedResults.results) {
            return res.json({
                ...cachedResults,
                results: userPrefs.personalizeResults(cachedResults.results),
                suggestion: correctedQuery
            });
        }
        
        return res.json({
            ...cachedResults,
            suggestion: correctedQuery
        });
    }
    
    // Get knowledge graph info
    getKnowledgeGraphInfo(query, (knowledgeInfo) => {
        // Normalize and tokenize the query
        let processedTokens = normalizeQuery(query);
        
        // Expand with synonyms for better recall
        processedTokens = expandWithSynonyms(processedTokens);
        
        if (processedTokens.length === 0) {
            return res.json([]);
        }
        
        // Build FTS5 query with processed tokens - use simpler approach
        const ftsQuery = processedTokens.join(' OR ');
        
        // Keep original query for title matching
        const searchTerms = query.trim().toLowerCase();
        
        // Query with custom ranking that prioritizes title matches
        const sql = `
            SELECT p.id, p.title, p.url, p.description, p.content, p.favicon,
                   GROUP_CONCAT(i.image_url, '|||') as images,
                   CASE
                       WHEN LOWER(TRIM(p.title)) = LOWER(TRIM(?)) THEN 1
                       WHEN LOWER(TRIM(p.title)) LIKE LOWER(TRIM(?) || ' - %') THEN 2
                       WHEN LOWER(p.title) LIKE LOWER(? || '%') THEN 3
                       WHEN LOWER(p.title) LIKE LOWER('%' || ? || '%') THEN 4
                       ELSE 5
                   END as title_priority,
                   LENGTH(p.title) as title_length
            FROM pages_fts
            INNER JOIN pages p ON pages_fts.rowid = p.id
            LEFT JOIN images i ON p.id = i.page_id
            WHERE pages_fts MATCH ?
            GROUP BY p.id
            ORDER BY title_priority ASC, title_length ASC, rank ASC
            LIMIT 10
        `;

        db.all(sql, [searchTerms, searchTerms, searchTerms, searchTerms, ftsQuery], (err, rows) => {
        if (err) {
            console.error("Database error:", err);
            res.status(500).send("Database error");
        } else {
            if (!rows || rows.length === 0) {
                const emptyResult = knowledgeInfo ? { knowledgeGraph: knowledgeInfo, results: [], suggestion: correctedQuery } : { results: [], suggestion: correctedQuery };
                searchCache.set(cacheKey, emptyResult);
                return res.json(emptyResult);
            }
            
            // Process images and prioritize relevant ones
            let results = rows.map(row => {
                let images = [];
                if (row.images) {
                    const allImages = row.images.split('|||').filter(img => img.trim());
                    // Remove duplicates
                    const uniqueImages = [...new Set(allImages)];
                    
                    // Sort: images with query terms in URL first
                    const matchingImages = uniqueImages.filter(img => 
                        processedTokens.some(token => img.toLowerCase().includes(token))
                    );
                    const otherImages = uniqueImages.filter(img => 
                        !processedTokens.some(token => img.toLowerCase().includes(token))
                    );
                    images = [...matchingImages, ...otherImages].slice(0, 4);
                }
                return {
                    title: row.title,
                    url: row.url,
                    description: row.description,
                    content: row.content,
                    images: images,
                    favicon: row.favicon,
                    personalizationScore: 0
                };
            });
            
            // Apply personalization if enabled
            if (enablePersonalization) {
                results = userPrefs.personalizeResults(results);
            }
            
            // Prepare response with knowledge graph if available
            const response = knowledgeInfo ? {
                knowledgeGraph: knowledgeInfo,
                results: results,
                suggestion: correctedQuery
            } : {
                results: results,
                suggestion: correctedQuery
            };
            
            // Cache the results (before personalization for broader use)
            const cacheResponse = knowledgeInfo ? {
                knowledgeGraph: knowledgeInfo,
                results: rows.map(row => {
                    let images = [];
                    if (row.images) {
                        const allImages = row.images.split('|||').filter(img => img.trim());
                        const uniqueImages = [...new Set(allImages)];
                        const matchingImages = uniqueImages.filter(img => 
                            processedTokens.some(token => img.toLowerCase().includes(token))
                        );
                        const otherImages = uniqueImages.filter(img => 
                            !processedTokens.some(token => img.toLowerCase().includes(token))
                        );
                        images = [...matchingImages, ...otherImages].slice(0, 4);
                    }
                    return {
                        title: row.title,
                        url: row.url,
                        description: row.description,
                        content: row.content,
                        images: images,
                        favicon: row.favicon
                    };
                })
            } : rows.map(row => ({
                title: row.title,
                url: row.url,
                description: row.description,
                content: row.content,
                images: row.images ? row.images.split('|||').filter(img => img.trim()).slice(0, 4) : [],
                favicon: row.favicon
            }));
            
            searchCache.set(cacheKey, cacheResponse);
            
            res.json(response);
        }
    });
    });

});

// Endpoint to record user clicks for personalization
app.post("/click", (req, res) => {
    const { url } = req.body;
    
    if (url) {
        userPrefs.recordClick(url);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'URL is required' });
    }
});

// Endpoint to get user's interest categories
app.get("/interests", (req, res) => {
    const interests = userPrefs.getInterestCategories();
    res.json(interests);
});



app.listen(process.env.PORT, () => {
    console.log('Backend Server is running on port ' + process.env.PORT);
});