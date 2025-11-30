// Simple user preference tracking for personalized ranking
// In production, this would be stored in a database with user IDs

class UserPreferences {
    constructor() {
        // Track click counts per URL to personalize results
        this.clickHistory = new Map();
        // Track search history to understand user interests
        this.searchHistory = [];
        this.maxHistorySize = 1000;
    }

    // Record a click on a search result
    recordClick(url) {
        const currentCount = this.clickHistory.get(url) || 0;
        this.clickHistory.set(url, currentCount + 1);
    }

    // Record a search query
    recordSearch(query) {
        this.searchHistory.push({
            query: query.toLowerCase(),
            timestamp: Date.now()
        });

        // Keep history bounded
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory.shift();
        }
    }

    // Get personalization score for a URL (higher = more relevant to user)
    getPersonalizationScore(url) {
        return this.clickHistory.get(url) || 0;
    }

    // Get user's interest categories based on search history
    getInterestCategories() {
        const categories = {};
        
        this.searchHistory.forEach(({ query }) => {
            // Simple category detection based on keywords
            if (query.includes('music') || query.includes('song') || query.includes('singer')) {
                categories['music'] = (categories['music'] || 0) + 1;
            }
            if (query.includes('movie') || query.includes('film') || query.includes('actor')) {
                categories['movies'] = (categories['movies'] || 0) + 1;
            }
            if (query.includes('book') || query.includes('author') || query.includes('novel')) {
                categories['books'] = (categories['books'] || 0) + 1;
            }
            if (query.includes('tech') || query.includes('software') || query.includes('computer')) {
                categories['technology'] = (categories['technology'] || 0) + 1;
            }
        });

        return categories;
    }

    // Boost results based on user preferences
    personalizeResults(results) {
        return results.map(result => {
            const personalizationScore = this.getPersonalizationScore(result.url);
            return {
                ...result,
                personalizationScore
            };
        }).sort((a, b) => {
            // Higher personalization score = higher ranking
            return b.personalizationScore - a.personalizationScore;
        });
    }

    // Clear old history (privacy feature)
    clearOldHistory(daysOld = 30) {
        const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
        this.searchHistory = this.searchHistory.filter(
            entry => entry.timestamp > cutoffTime
        );
    }
}

module.exports = UserPreferences;
