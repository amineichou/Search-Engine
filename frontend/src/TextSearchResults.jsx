import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [knowledgeGraph, setKnowledgeGraph] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredResult, setHoveredResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      setSearchTerm(q);
      fetchResults(q);
    }
  }, [searchParams]);

  const fetchResults = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      // Set spell suggestion if available
      setSuggestion(data.suggestion || null);

      // Check if response has knowledge graph
      if (data.knowledgeGraph) {
        setKnowledgeGraph(data.knowledgeGraph);
        setResults(data.results || []);
      } else {
        setKnowledgeGraph(null);
        setResults(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      setResults([]);
      setKnowledgeGraph(null);
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  };

  // Track clicks for personalization
  const handleResultClick = async (url) => {
    try {
      await fetch('http://localhost:4000/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  // Sort images by format priority: JPG > JPEG > PNG > WEBP > others
  const sortImagesByFormat = (images) => {
    return images.sort((a, b) => {
      const getFormatPriority = (url) => {
        const lower = url.toLowerCase();
        if (lower.includes('.jpg')) return 1;
        if (lower.includes('.jpeg')) return 2;
        if (lower.includes('.png')) return 3;
        if (lower.includes('.webp')) return 4;
        return 5;
      };
      return getFormatPriority(a.url) - getFormatPriority(b.url);
    });
  };

  // Get all images from results
  const getAllImages = () => {
    const allImages = [];
    results.forEach(result => {
      if (result.images && result.images.length > 0) {
        result.images.forEach(img => {
          if (img) allImages.push({ url: img, pageUrl: result.url, title: result.title });
        });
      }
    });
    return sortImagesByFormat(allImages);
  };

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const filteredResults = results;

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Search Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
            {/* Logo */}
            <h1
              className="text-2xl font-semibold text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
              onClick={() => navigate('/')}
            >
              Search
            </h1>

            {/* Search Box */}
            <div className="flex-1 w-full sm:max-w-2xl">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search anything..."
                  className="w-full pl-12 pr-12 py-3 text-base border border-gray-300 rounded-lg 
                            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                            bg-white"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

          </div>
          {/* Navigation */}
          <div className="flex gap-8 mt-4 md:ml-30">
            <button
              className="pb-3 text-sm font-medium border-b-2 text-blue-600 border-blue-600 cursor-pointer"
              onClick={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
            >
              All
            </button>
            <button
              className="pb-3 text-sm font-medium border-b-2 text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300 cursor-pointer"
              onClick={() => navigate(`/images?q=${encodeURIComponent(query)}`)}
            >
              Images
            </button>
          </div>
        </div>
      </header>

      {/* Results Section */}
      <main className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Spell Suggestion */}
        {suggestion && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <span className="text-sm text-gray-700">Did you mean: </span>
            <button
              onClick={() => navigate(`/search?q=${encodeURIComponent(suggestion)}`)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
            >
              {suggestion}
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left Side - Search Results */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="space-y-4 w-full">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-6 bg-gray-300 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Knowledge Graph Card and Images */}

                {(knowledgeGraph || getAllImages().length > 0) && (
                  <div className="mb-6 max-w-3xl">
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {/* Images Section */}
                      {getAllImages().length > 0 && (
                        <div className="p-2 bg-gray-50 border-b border-gray-200">
                          <div className="grid grid-cols-4 gap-1.5">
                            {getAllImages().slice(0, 4).map((img, index) => (
                              <a
                                key={index}
                                href={img.pageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="aspect-square overflow-hidden rounded-md bg-gray-100 border border-gray-200"
                              >
                                <img
                                  src={img.url}
                                  alt={img.title}
                                  className="w-full h-full object-cover hover:opacity-95"
                                  loading="lazy"
                                  onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Knowledge Graph Content */}
                      {knowledgeGraph && (
                        <div className="p-5">
                          <h2 className="text-xl font-normal text-gray-900 mb-2">
                            <a href={knowledgeGraph.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {knowledgeGraph.title}
                            </a>
                          </h2>
                          {knowledgeGraph.description && (
                            <p className="text-sm text-gray-600 leading-relaxed">{knowledgeGraph.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}



                {/* Results Count */}
                {filteredResults.length > 0 && (
                  <div className="text-sm text-gray-500 mb-6">
                    About {filteredResults.length === 30 ? "30+" : filteredResults.length} results
                  </div>
                )}

                {/* Results List or Grid */}
                <div className="space-y-7">
                  {filteredResults.length > 0 ? (
                    filteredResults.map((result, index) => (
                      <div
                        key={index}
                        className="group max-w-5xl"
                        onMouseEnter={() => setHoveredResult(index)}
                        onMouseLeave={() => setHoveredResult(null)}
                      >
                        {/* URL */}
                        <div className="flex items-center gap-2 mb-1">
                          {result.favicon ? (
                            <img
                              src={result.favicon}
                              alt=""
                              className="w-4 h-4 rounded-sm"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <svg className={`w-4 h-4 ${hoveredResult === index ? 'text-blue-600' : 'text-gray-500'
                            } ${result.favicon ? 'hidden' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {result.url.startsWith('https') ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                          </svg>
                          <span className="text-sm text-gray-600 truncate">
                            {result.url.replace(/^https?:\/\/(www\.)?/, '')}
                          </span>
                        </div>

                        {/* Title */}
                        <a
                          href={result.url}
                          onClick={() => handleResultClick(result.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xl text-blue-600 hover:text-blue-700 hover:underline font-medium block mb-2 line-clamp-1"
                        >
                          {result.title}
                          {result.personalizationScore > 0 && (
                            <span className="ml-2 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-normal border border-green-200">★ Visited</span>
                          )}
                        </a>

                        {/* Description or Content */}
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                          {result.description || result.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    !loading && (
                      <div className="flex justify-center items-center w-full">
                        <div className="p-12 text-center">
                          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <p className="text-gray-800 text-lg font-medium mb-1">No results found for "{searchTerm}"</p>
                          <p className="text-gray-500 text-sm">Try different keywords or check your spelling</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

    </div>
  );
};

export default SearchResults;
